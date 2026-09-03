import { prisma } from "./db";
import { notify } from "./notify";
import { writeAudit } from "./audit";
import { SessionUser } from "./auth";
import { Roles } from "./constants";
import { parseQrContent, cleanCodeInput, formatPassCode } from "./tokens";

export async function registerEntryOfficerId(user: SessionUser | null): Promise<string | null> {
  let oid = user?.officerId ?? null;
  if (!oid && user && user.role === Roles.SECURITY_OFFICER) {
    const o = await prisma.securityOfficer.findFirst({ where: { userId: user.sub }, select: { id: true } });
    oid = o?.id ?? null;
  }
  return oid;
}

export async function evaluateVisitorPass(passId: string) {
  const pass = await prisma.gatePass.findUnique({
    where: { id: passId },
    include: { resident: true },
  });
  if (!pass) return { allowed: false, reason: "Pass not found.", pass: null as any };
  if (pass.resident?.propertyStatus === "SUSPENDED")
    return { allowed: false, reason: "Host resident access is SUSPENDED (unpaid dues).", pass };
  if (pass.status === "REVOKED" || pass.status === "CANCELLED")
    return { allowed: false, reason: `Pass is ${pass.status.toLowerCase()}.`, pass };
  if (pass.status === "USED" && pass.maxUses <= pass.usesCount)
    return { allowed: false, reason: "Pass has already been used.", pass };
  if (pass.expiresAt && new Date(pass.expiresAt).getTime() < Date.now())
    return { allowed: false, reason: "Pass has expired.", pass };
  return { allowed: true, reason: "", pass };
}

export async function resolveVisitorQr(raw: string): Promise<{
  parsed: boolean;
  allowed: boolean;
  reason: string;
  pass: any;
}> {
  const token = parseQrContent(raw);
  if (!token) return { parsed: false, allowed: false, reason: "Invalid QR format.", pass: null };
  const pass = await prisma.gatePass.findFirst({
    where: { OR: [{ token }, { code: token }] },
    include: {
      resident: { include: { property: true } },
    },
  });
  if (!pass) {
    return { parsed: true, allowed: false, reason: "Unknown or revoked pass. Access denied.", pass: null };
  }
  const evalRes = await evaluateVisitorPass(pass.id);
  return { parsed: true, allowed: evalRes.allowed, reason: evalRes.reason, pass };
}

export async function visitorCheckIn(
  raw: string,
  actor: SessionUser,
  ip?: string | null,
  ua?: string | null,
  opts?: { force?: boolean; vehiclePlate?: string | null }
) {
  const token = parseQrContent(raw);
  if (!token) return { ok: false as const, reason: "Invalid QR format." };

  const pass = await prisma.gatePass.findFirst({
    where: { OR: [{ token }, { code: token }] },
    include: {
      resident: { include: { property: true } },
    },
  });

  if (!pass) {
    await recordDenied(actor, "VISITOR", { token, reason: "Unknown pass / not found" }, ip, ua);
    return { ok: false as const, reason: "Access denied. Pass not recognized." };
  }

  const evalRes = await evaluateVisitorPass(pass.id);
  if (!evalRes.allowed) {
    await recordDenied(actor, "VISITOR", {
      token,
      residentId: pass.residentId,
      reason: evalRes.reason,
    }, ip, ua);
    return { ok: false as const, reason: evalRes.reason };
  }

  const oid = await registerEntryOfficerId(actor);
  const log = await prisma.accessLog.create({
    data: {
      personType: pass.passType === "VISITOR" ? "VISITOR" : "RESIDENT",
      visitorId: pass.visitorId,
      residentId: pass.residentId,
      propertyId: pass.resident?.propertyId ?? null,
      gatePassId: pass.id,
      action: pass.direction || "ENTRY",
      status: "INSIDE",
      token: pass.token,
      securityOfficerId: oid,
      vehiclePlate: opts?.vehiclePlate ?? pass.vehiclePlate ?? null,
      source: "SCAN",
      deviceInfo: { ip, ua } as any,
    },
  });

  await prisma.gatePass.update({
    where: { id: pass.id },
    data: {
      usesCount: { increment: 1 },
      status: pass.maxUses <= pass.usesCount + 1 ? "USED" : "ACTIVE",
      usedAt: new Date(),
    },
  });
  if (pass.visitorId) {
    await prisma.visitor.update({
      where: { id: pass.visitorId },
      data: { status: "APPROVED" },
    }).catch(() => null);
  }

  if (pass.resident?.userId) {
    await notify([{ userId: pass.resident.userId }], {
      type: "VISITOR_ARRIVAL",
      title: "Visitor arrived",
      message: `${pass.visitorName || "Your visitor"} arrived at the estate gate.`,
      actorName: actor.name,
      link: "/resident/history",
    });
  }

  await writeAudit({
    actor, action: "VISITOR_ENTRY",
    entityType: "GatePass", entityId: pass.id,
    summary: `${pass.resident?.firstName ?? ""} ${pass.resident?.lastName ?? ""} visit — ${pass.visitorName || "Visitor"}`,
    ip, userAgent: ua,
  });

  return { ok: true as const, message: "Visitor granted entry.", accessLogId: log.id, record: { pass, log } };
}

export async function visitorCheckOut(
  visitorId: string,
  actor: SessionUser,
  ip?: string | null,
  ua?: string | null
) {
  const openLog = await prisma.accessLog.findFirst({
    where: { visitorId, status: "INSIDE", action: "ENTRY" },
    orderBy: { entryAt: "desc" },
  });
  if (!openLog) return { ok: false as const, reason: "No active (inside) record for this visitor." };

  const exitAt = new Date();
  const durationSeconds = Math.max(0, Math.round((exitAt.getTime() - openLog.entryAt.getTime()) / 1000));
  const log = await prisma.accessLog.update({
    where: { id: openLog.id },
    data: { action: "EXIT", status: "EXITED", exitAt, durationSeconds },
  });
  await prisma.visitor.update({ where: { id: visitorId }, data: { status: "APPROVED" } });
  await writeAudit({
    actor, action: "VISITOR_EXIT_AUTO",
    entityType: "Visitor", entityId: visitorId,
    summary: `Visitor checked out (duration ${durationSeconds}s)`,
    ip, userAgent: ua,
  });
  return { ok: true as const, visitorId, log };
}

export async function recordDenied(
  actor: SessionUser,
  personType: "VISITOR" | "DISPATCH" | "RESIDENT",
  input: {
    token?: string | null;
    visitorId?: string | null;
    dispatchId?: string | null;
    residentId?: string | null;
    reason: string;
  },
  ip?: string | null,
  ua?: string | null
) {
  const oid = await registerEntryOfficerId(actor);
  const log = await prisma.accessLog.create({
    data: {
      personType,
      visitorId: input.visitorId,
      dispatchId: input.dispatchId,
      residentId: input.residentId,
      action: "DENIED",
      status: "DENIED",
      token: input.token,
      securityOfficerId: oid,
      reason: input.reason,
      source: "SCAN",
      deviceInfo: { ip, ua } as any,
    },
  });
  await writeAudit({
    actor, action: "ACCESS_DENIED",
    entityType: personType === "VISITOR" ? "Visitor" : personType === "RESIDENT" ? "Resident" : "DispatchRider",
    entityId: input.visitorId ?? input.dispatchId ?? input.residentId ?? undefined,
    summary: `Denied: ${input.reason}`,
    ip, userAgent: ua,
  });
  await notify(
    [{ role: Roles.ESTATE_MANAGEMENT }, { role: Roles.SUPER_ADMIN }],
    {
      type: "SECURITY_ALERT",
      title: "Denied access attempt",
      message: `A ${personType.toLowerCase()} access attempt was denied: ${input.reason}`,
      actorName: actor.name,
      link: "/access-logs",
    }
  );
  return log;
}

export async function verifyGatePass(raw: string): Promise<{
  valid: boolean;
  reason: string;
  gatePass: any;
}> {
  const clean = cleanCodeInput(raw);
  if (!clean) {
    return { valid: false, reason: "Please enter a valid pass code or scan a QR code.", gatePass: null };
  }

  // 1. Try finding in GatePass by code or token
  const pass = await prisma.gatePass.findFirst({
    where: {
      OR: [
        { code: clean },
        { token: clean },
      ],
    },
    include: {
      resident: {
        include: { property: true, user: { select: { email: true, phone: true } } },
      },
    },
  });

  if (pass) {
    const isExpired = pass.expiresAt && new Date(pass.expiresAt).getTime() < Date.now();
    let valid = true;
    let reason = "";

    if (pass.resident.propertyStatus === "SUSPENDED") {
      valid = false;
      reason = "Host resident access is SUSPENDED (unpaid dues). Entry denied.";
    } else if (pass.status === "REVOKED" || pass.status === "CANCELLED") {
      valid = false;
      reason = `Pass has been ${pass.status.toLowerCase()}.`;
    } else if (pass.status === "USED" || pass.usesCount >= pass.maxUses) {
      valid = false;
      reason = `Pass has already been used${pass.usedAt ? ` on ${new Date(pass.usedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}.`;
    } else if (isExpired) {
      valid = false;
      reason = "Pass has expired.";
    }

    return {
      valid,
      reason,
      gatePass: {
        id: pass.id,
        code: pass.code,
        formattedCode: formatPassCode(pass.code),
        passType: pass.passType,
        direction: pass.direction,
        status: isExpired && pass.status === "ACTIVE" ? "EXPIRED" : pass.status,
        validFrom: pass.validFrom,
        expiresAt: pass.expiresAt,
        usedAt: pass.usedAt,
        visitorName: pass.visitorName,
        visitorPhone: pass.visitorPhone,
        visitorType: pass.visitorType,
        vehiclePlate: pass.vehiclePlate,
        purpose: pass.purpose,
        notes: pass.notes,
        resident: {
          id: pass.resident.id,
          name: `${pass.resident.firstName} ${pass.resident.lastName}`,
          unitNumber: pass.resident.property?.unitNumber ?? "Unit",
          block: pass.resident.property?.block ?? "",
          phone: pass.resident.phone,
        },
      },
    };
  }

  return { valid: false, reason: "Code or QR not recognized. Access denied.", gatePass: null };
}

export async function confirmGateAccess(
  rawOrId: string,
  actor: SessionUser,
  ip?: string | null,
  ua?: string | null,
  opts?: { action?: "ENTRY" | "EXIT"; vehiclePlate?: string | null; notes?: string | null }
) {
  const clean = cleanCodeInput(rawOrId);
  const pass = await prisma.gatePass.findFirst({
    where: {
      OR: [
        { id: rawOrId.length === 36 ? rawOrId : undefined },
        { code: clean },
        { token: clean },
      ].filter(Boolean) as any,
    },
    include: {
      resident: { include: { property: true, user: true } },
    },
  });

  if (!pass) {
    return visitorCheckIn(rawOrId, actor, ip, ua, { vehiclePlate: opts?.vehiclePlate });
  }

  const isExpired = pass.expiresAt && new Date(pass.expiresAt).getTime() < Date.now();
  if (pass.status === "REVOKED" || pass.status === "CANCELLED") {
    await recordDenied(actor, pass.passType === "VISITOR" ? "VISITOR" : "RESIDENT", { token: pass.code, residentId: pass.residentId, reason: `Pass is ${pass.status.toLowerCase()}` }, ip, ua);
    return { ok: false, reason: `Pass is ${pass.status.toLowerCase()}.` };
  }
  if (pass.status === "USED" || pass.usesCount >= pass.maxUses) {
    await recordDenied(actor, pass.passType === "VISITOR" ? "VISITOR" : "RESIDENT", { token: pass.code, residentId: pass.residentId, reason: "Pass has already been used." }, ip, ua);
    return { ok: false, reason: "Pass has already been used." };
  }
  if (isExpired) {
    await recordDenied(actor, pass.passType === "VISITOR" ? "VISITOR" : "RESIDENT", { token: pass.code, residentId: pass.residentId, reason: "Pass has expired." }, ip, ua);
    return { ok: false, reason: "Pass has expired." };
  }

  const action = opts?.action || (pass.direction === "EXIT" ? "EXIT" : "ENTRY");
  const personType = pass.passType === "VISITOR" ? "VISITOR" : "RESIDENT";
  const vehiclePlate = opts?.vehiclePlate || pass.vehiclePlate || null;
  const oid = await registerEntryOfficerId(actor);

  const log = await prisma.accessLog.create({
    data: {
      personType: personType as any,
      action: action as any,
      status: action === "ENTRY" ? "INSIDE" : "EXITED",
      gatePassId: pass.id,
      residentId: pass.residentId,
      propertyId: pass.resident.propertyId ?? null,
      vehiclePlate,
      token: pass.code,
      securityOfficerId: oid,
      source: "MOBILE_VERIFIED",
      notes: opts?.notes ?? pass.notes ?? null,
      deviceInfo: { ip, ua } as any,
      entryAt: action === "ENTRY" ? new Date() : undefined,
      exitAt: action === "EXIT" ? new Date() : undefined,
    },
  });

  const nextUses = pass.usesCount + 1;
  const nextStatus = nextUses >= pass.maxUses ? "USED" : "ACTIVE";
  await prisma.gatePass.update({
    where: { id: pass.id },
    data: {
      usesCount: nextUses,
      status: nextStatus,
      usedAt: new Date(),
    },
  });

  // Notify resident
  if (pass.resident.userId) {
    const holderDesc = pass.passType === "VISITOR" ? (pass.visitorName || "Your visitor") : "Resident pass";
    await notify([{ userId: pass.resident.userId }], {
      type: action === "ENTRY" ? "VISITOR_ARRIVAL" : "VISITOR_CHECKOUT",
      title: `${holderDesc} — Gate ${action === "ENTRY" ? "Entry" : "Exit"} Confirmed`,
      message: `${holderDesc} was granted gate ${action.toLowerCase()} by ${actor.name}.`,
      actorName: actor.name,
      link: "/resident/history",
    });
  }

  await writeAudit({
    actor,
    action: action === "ENTRY" ? "GATE_ENTRY_GRANTED" : "GATE_EXIT_GRANTED",
    entityType: "GatePass",
    entityId: pass.id,
    summary: `Granted ${action.toLowerCase()} for ${pass.passType}: ${pass.visitorName || pass.resident.firstName} (Code: ${formatPassCode(pass.code)})`,
    ip,
    userAgent: ua,
  });

  return {
    ok: true,
    message: `Access granted (${action}).`,
    accessLogId: log.id,
    action,
    personType,
  };
}

export async function revokePass(passId: string, revokerId: string) {
  return prisma.gatePass.update({
    where: { id: passId },
    data: { status: "CANCELLED" },
  });
}

export async function currentlyInsideCounts() {
  const visitors = await prisma.accessLog.count({ where: { personType: "VISITOR", status: "INSIDE" } });
  const dispatch = await prisma.accessLog.count({ where: { personType: "DISPATCH", status: "INSIDE" } });
  const vehicles = await prisma.accessLog.count({ where: { status: "INSIDE", NOT: { vehiclePlate: null } } });
  return { visitors, dispatch, vehicles };
}

export function toDate(v?: string | null): Date | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}
