import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncH, ApiError } from "../guard";
import { authRequired } from "../middleware";
import {
  generateUniqueGatePassCode,
  generateSecureToken,
  qrContentForToken,
  renderQrDataUrl,
  formatPassCode,
} from "../tokens";
import { writeAudit } from "../audit";

const router = Router();

router.get("/profile", authRequired(["RESIDENT"]), asyncH(async (req, res) => {
  const user = req.user!;
  if (!user.residentId) throw new ApiError("No resident profile linked.", 404);
  const resident = await prisma.resident.findUnique({
    where: { id: user.residentId },
    include: {
      property: true,
      vehicles: true,
      user: { select: { email: true, phone: true, isActive: true } },
    },
  });
  if (!resident) throw new ApiError("Resident not found.", 404);
  const visitors = await prisma.visitor.count({ where: { residentId: resident.id } });
  const riders = await prisma.dispatchRider.count({ where: { residentId: resident.id } });
  res.json({ resident, stats: { visitors, riders } });
}));

router.get("/history", authRequired(["RESIDENT"]), asyncH(async (req, res) => {
  const user = req.user!;
  if (!user.residentId) throw new ApiError("No resident profile.", 404);
  const [accessLogs, visitors, riders, gatePasses] = await Promise.all([
    prisma.accessLog.findMany({
      where: { residentId: user.residentId },
      include: { visitor: { select: { fullName: true } }, dispatch: { select: { riderName: true, company: true } }, property: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.visitor.findMany({
      where: { residentId: user.residentId },
      include: { passes: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.dispatchRider.findMany({ where: { residentId: user.residentId }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.gatePass.findMany({
      where: { residentId: user.residentId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  res.json({ accessLogs, visitors, riders, gatePasses });
}));

// ---------------- Gate Pass Generation for Residents ----------------

// 1. Generate code for a visitor at the gate (including deliveries/dispatch)
const visitorCodeSchema = z.object({
  visitorName: z.string().min(1, "Visitor name is required"),
  visitorPhone: z.string().optional().nullable(),
  visitorType: z.enum(["GUEST", "DELIVERY", "SERVICE", "CONTRACTOR", "FAMILY", "OTHER"]).default("GUEST"),
  vehiclePlate: z.string().optional().nullable(),
  purpose: z.string().optional().nullable(),
  durationHours: z.number().min(1).max(72).default(2), // 2 hours default security window
  direction: z.enum(["ENTRY", "EXIT"]).default("ENTRY"),
});

router.post("/codes/visitor", authRequired(["RESIDENT"]), asyncH(async (req, res) => {
  const user = req.user!;
  if (!user.residentId) throw new ApiError("No resident profile linked.", 403);

  const resident = await prisma.resident.findUnique({ where: { id: user.residentId } });
  if (!resident) throw new ApiError("Resident profile not found.", 404);
  if (resident.propertyStatus === "SUSPENDED") {
    throw new ApiError("Your gate access has been suspended (e.g. unpaid monthly dues). Please contact estate management.", 403);
  }
  if (resident.propertyStatus === "INACTIVE") {
    throw new ApiError("Your resident account is inactive.", 403);
  }

  const parsed = visitorCodeSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(parsed.error.issues[0].message, 400);
  const d = parsed.data;

  const code = await generateUniqueGatePassCode();
  const token = generateSecureToken();
  const qrContent = qrContentForToken(token);
  const expiresAt = new Date(Date.now() + d.durationHours * 3600 * 1000);

  // Also create visitor record for audit/admin overview
  const visitor = await prisma.visitor.create({
    data: {
      residentId: user.residentId,
      fullName: d.visitorName,
      phone: d.visitorPhone ?? null,
      visitorType: d.visitorType as any,
      purpose: d.purpose ?? (d.visitorType === "DELIVERY" ? "Delivery / Dispatch" : "Visit"),
      vehiclePlate: d.vehiclePlate ?? null,
      status: "APPROVED",
      expectedArrival: new Date(),
      expectedDeparture: expiresAt,
      registeredById: user.sub,
    },
  });

  const gatePass = await prisma.gatePass.create({
    data: {
      code,
      token,
      qrContent,
      passType: "VISITOR",
      residentId: user.residentId,
      visitorName: d.visitorName,
      visitorPhone: d.visitorPhone ?? null,
      visitorType: d.visitorType as any,
      vehiclePlate: d.vehiclePlate ?? null,
      purpose: d.purpose ?? (d.visitorType === "DELIVERY" ? "Delivery / Dispatch" : "Visit"),
      direction: d.direction,
      status: "ACTIVE",
      maxUses: 1,
      expiresAt,
    },
    include: {
      resident: { include: { property: true } },
    },
  });

  const qrDataUrl = await renderQrDataUrl(qrContent);

  await writeAudit({
    actor: user,
    action: "VISITOR_PASS_GENERATED",
    entityType: "GatePass",
    entityId: gatePass.id,
    summary: `Generated visitor pass ${code} for ${d.visitorName}`,
    ip: req.clientIp ?? null,
    userAgent: req.userAgent ?? null,
  });

  res.status(201).json({
    ok: true,
    gatePass,
    code,
    formattedCode: formatPassCode(code),
    qrDataUrl,
    visitor,
  });
}));

// 2. Generate code for resident going out or coming in
const selfCodeSchema = z.object({
  direction: z.enum(["EXIT", "ENTRY", "ROUNDTRIP"]).default("EXIT"),
  vehiclePlate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  durationHours: z.number().min(1).max(24).default(2), // 2 hours default security window
});

router.post("/codes/self", authRequired(["RESIDENT"]), asyncH(async (req, res) => {
  const user = req.user!;
  if (!user.residentId) throw new ApiError("No resident profile linked.", 403);

  const resident = await prisma.resident.findUnique({
    where: { id: user.residentId },
    include: { property: true },
  });
  if (!resident) throw new ApiError("Resident profile not found.", 404);
  if (resident.propertyStatus === "SUSPENDED") {
    throw new ApiError("Your gate access has been suspended (e.g. unpaid monthly dues). Please contact estate management.", 403);
  }
  if (resident.propertyStatus === "INACTIVE") {
    throw new ApiError("Your resident account is inactive.", 403);
  }

  const parsed = selfCodeSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(parsed.error.issues[0].message, 400);
  const d = parsed.data;

  const code = await generateUniqueGatePassCode();
  const token = generateSecureToken();
  const qrContent = qrContentForToken(token);
  const expiresAt = new Date(Date.now() + d.durationHours * 3600 * 1000);

  const passType =
    d.direction === "EXIT"
      ? "RESIDENT_EXIT"
      : d.direction === "ENTRY"
      ? "RESIDENT_ENTRY"
      : "RESIDENT_ROUNDTRIP";

  const direction = d.direction === "ROUNDTRIP" ? "EXIT" : d.direction;
  const maxUses = d.direction === "ROUNDTRIP" ? 2 : 1;

  const gatePass = await prisma.gatePass.create({
    data: {
      code,
      token,
      qrContent,
      passType,
      residentId: user.residentId,
      vehiclePlate: d.vehiclePlate ?? null,
      purpose: d.direction === "EXIT" ? "Resident Going Out" : d.direction === "ENTRY" ? "Resident Returning" : "Roundtrip Exit & Return",
      direction,
      status: "ACTIVE",
      maxUses,
      expiresAt,
      notes: d.notes ?? null,
    },
    include: {
      resident: { include: { property: true } },
    },
  });

  const qrDataUrl = await renderQrDataUrl(qrContent);

  await writeAudit({
    actor: user,
    action: "RESIDENT_SELF_PASS_GENERATED",
    entityType: "GatePass",
    entityId: gatePass.id,
    summary: `Generated self-pass ${code} (${d.direction}) for ${resident?.firstName} ${resident?.lastName}`,
    ip: req.clientIp ?? null,
    userAgent: req.userAgent ?? null,
  });

  res.status(201).json({
    ok: true,
    gatePass,
    code,
    formattedCode: formatPassCode(code),
    qrDataUrl,
  });
}));

// 3. List active & recent codes for this resident
router.get("/codes", authRequired(["RESIDENT"]), asyncH(async (req, res) => {
  const user = req.user!;
  if (!user.residentId) throw new ApiError("No resident profile linked.", 403);

  const passes = await prisma.gatePass.findMany({
    where: { residentId: user.residentId },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: {
      resident: { select: { firstName: true, lastName: true, property: { select: { unitNumber: true } } } },
    },
  });

  const now = Date.now();
  const enriched = await Promise.all(
    passes.map(async (p) => {
      const isExpired = p.expiresAt && new Date(p.expiresAt).getTime() < now;
      const status = isExpired && p.status === "ACTIVE" ? "EXPIRED" : p.status;
      return {
        ...p,
        status,
        formattedCode: formatPassCode(p.code),
        qrDataUrl: p.status === "ACTIVE" && !isExpired ? await renderQrDataUrl(p.qrContent) : null,
      };
    })
  );

  const active = enriched.filter((p) => p.status === "ACTIVE");
  const past = enriched.filter((p) => p.status !== "ACTIVE");

  res.json({ active, past, total: passes.length });
}));

// 4. Revoke/cancel an active pass code
router.post("/codes/:id/revoke", authRequired(["RESIDENT"]), asyncH(async (req, res) => {
  const user = req.user!;
  if (!user.residentId) throw new ApiError("No resident profile linked.", 403);

  const pass = await prisma.gatePass.findFirst({
    where: { id: req.params.id, residentId: user.residentId },
  });
  if (!pass) throw new ApiError("Pass not found or unauthorized.", 404);

  await prisma.gatePass.update({
    where: { id: pass.id },
    data: { status: "CANCELLED" },
  });

  res.json({ ok: true, message: "Pass code cancelled." });
}));

export default router;

