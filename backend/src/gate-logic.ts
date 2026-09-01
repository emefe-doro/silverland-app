import { prisma } from "./db";
import { notify } from "./notify";
import { writeAudit } from "./audit";
import { SessionUser } from "./auth";
import { Roles } from "./constants";
import { parseQrContent } from "./tokens";

export async function registerEntryOfficerId(user: SessionUser | null): Promise<string | null> {
  let oid = user?.officerId ?? null;
  if (!oid && user && user.role === Roles.SECURITY_OFFICER) {
    const o = await prisma.securityOfficer.findFirst({ where: { userId: user.sub }, select: { id: true } });
    oid = o?.id ?? null;
  }
  return oid;
}

export async function evaluateVisitorPass(passId: string) {
  const pass = await prisma.visitorPass.findUnique({
    where: { id: passId },
    include: { visitor: true },
  });
  if (!pass) return { allowed: false, reason: "Pass not found.", pass: null as any };
  if (pass.status === "REVOKED" || pass.status === "CANCELLED")
    return { allowed: false, reason: `Pass is ${pass.status.toLowerCase()}.`, pass };
  if (pass.status === "USED" && pass.maxUses <= pass.usesCount)
    return { allowed: false, reason: "Pass has already been used.", pass };
  if (pass.expiresAt && new Date(pass.expiresAt).getTime() < Date.now())
    return { allowed: false, reason: "Pass has expired.", pass };
  if (pass.visitor?.status === "CANCELLED" || pass.visitor?.status === "DENIED")
    return { allowed: false, reason: `Visitor status is ${pass.visitor.status.toLowerCase()}.`, pass };
  if (pass.visitor?.status === "PENDING")
    return { allowed: false, reason: "Visitor is awaiting approval.", pass };
  if (pass.visitor?.status === "EXPIRED")
    return { allowed: false, reason: "Visitor pass appointment has expired.", pass };
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
  const pass = await prisma.visitorPass.findUnique({
    where: { token },
    include: {
      visitor: { include: { resident: { include: { property: true } }, registeredBy: true } },
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

  const pass = await prisma.visitorPass.findUnique({
    where: { token },
    include: {
      visitor: { include: { resident: { include: { property: true } }, registeredBy: true } },
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
      visitorId: pass.visitorId,
      residentId: pass.visitor?.residentId,
      reason: evalRes.reason,
    }, ip, ua);
    return { ok: false as const, reason: evalRes.reason };
  }

  const oid = await registerEntryOfficerId(actor);
  const log = await prisma.accessLog.create({
    data: {
      personType: "VISITOR",
      visitorId: pass.visitorId,
      residentId: pass.visitor?.residentId ?? null,
      propertyId: pass.visitor?.resident?.propertyId ?? null,
      action: "ENTRY",
      status: "INSIDE",
      token,
      securityOfficerId: oid,
      vehiclePlate: opts?.vehiclePlate ?? pass.visitor?.vehiclePlate ?? null,
      source: "SCAN",
      deviceInfo: { ip, ua } as any,
    },
  });

  await prisma.visitorPass.update({
    where: { id: pass.id },
    data: { usesCount: { increment: 1 }, status: pass.maxUses <= pass.usesCount + 1 ? "USED" : "ACTIVE" },
  });
  await prisma.visitor.update({
    where: { id: pass.visitorId },
    data: { status: "APPROVED" },
  });

  await notify([{ userId: pass.visitor?.registeredBy?.id ?? null }], {
    type: "VISITOR_ARRIVAL",
    title: "Your pre-registered guest arrived",
    message: `${pass.visitor?.fullName} arrived at the estate gate.`,
    actorName: actor.name,
    link: "/resident/visitors",
  });
  const residentUser = pass.visitor?.resident?.userId;
  const extraTargets = residentUser && residentUser !== pass.visitor?.registeredBy?.id ? [{ userId: residentUser }] : [];
  await notify(extraTargets, {
    type: "VISITOR_ARRIVAL",
    title: "Visitor arrived",
    message: `${pass.visitor?.fullName} is at the gate (${pass.visitor?.purpose ?? "visit"}).`,
    actorName: actor.name,
    link: "/resident/visitors",
  });

  await writeAudit({
    actor, action: "VISITOR_ENTRY",
    entityType: "Visitor", entityId: pass.visitorId,
    summary: `${pass.visitor?.resident?.firstName ?? ""} ${pass.visitor?.resident?.lastName ?? ""} visit — ${pass.visitor?.fullName}`,
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
  personType: "VISITOR" | "DISPATCH",
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
    entityType: personType === "VISITOR" ? "Visitor" : "DispatchRider",
    entityId: input.visitorId ?? input.dispatchId ?? undefined,
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

export async function revokePass(passId: string, revokerId: string) {
  return prisma.visitorPass.update({
    where: { id: passId },
    data: { status: "REVOKED", revokedAt: new Date(), revokedById: revokerId },
  });
}

export async function currentlyInsideCounts() {
  const visitors = await prisma.accessLog.count({ where: { personType: "VISITOR", status: "INSIDE" } });
  const dispatch = await prisma.accessLog.count({ where: { personType: "DISPATCH", status: "INSIDE" } });
  const vehicles = await prisma.accessLog.count({ where: { status: "INSIDE", NOT: { vehiclePlate: null } } });
  return { visitors, dispatch, vehicles };
}

export async function toDate(v?: string | null): Promise<Date | undefined> {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}
