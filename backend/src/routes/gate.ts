import { Router } from "express";
import { resolveVisitorQr, visitorCheckIn, visitorCheckOut, recordDenied, verifyGatePass, confirmGateAccess } from "../gate-logic";
import { renderQrDataUrl } from "../tokens";
import { asyncH, ApiError } from "../guard";
import { authRequired } from "../middleware";
import { prisma } from "../db";

const router = Router();
const GATE = ["SUPER_ADMIN", "SECURITY_OFFICER"];

// ---------------- Modern Mobile Officer Endpoints ----------------

// Verify a 6-digit code or QR token called out by resident/visitor
router.post("/verify-code", authRequired(GATE as any), asyncH(async (req, res) => {
  const code = (req.body?.code as string) || (req.body?.qr as string) || "";
  if (!code) throw new ApiError("Pass code is required.", 400);

  const result = await verifyGatePass(code);
  res.json(result);
}));

// List all gate passes for admin/officer overview
router.get("/passes", authRequired(["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER"] as any), asyncH(async (req, res) => {
  const q = ((req.query.q as string) ?? "").trim();
  const status = (req.query.status as string) || "";
  const passType = (req.query.passType as string) || "";
  const limit = Math.min(Number((req.query.limit as string) || 50), 200);

  const where: any = {};
  if (status) where.status = status;
  if (passType) where.passType = passType;
  if (q) {
    where.OR = [
      { code: { contains: q } },
      { visitorName: { contains: q, mode: "insensitive" } },
      { vehiclePlate: { contains: q, mode: "insensitive" } },
      { resident: { firstName: { contains: q, mode: "insensitive" } } },
      { resident: { lastName: { contains: q, mode: "insensitive" } } },
    ];
  }

  const passes = await prisma.gatePass.findMany({
    where,
    include: {
      resident: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          property: { select: { unitNumber: true, block: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const total = await prisma.gatePass.count({ where });
  res.json({ passes, total });
}));


// Confirm & grant entry or exit
router.post("/confirm-access", authRequired(GATE as any), asyncH(async (req, res) => {
  const code = (req.body?.code as string) || (req.body?.passId as string) || (req.body?.qr as string) || "";
  if (!code) throw new ApiError("Pass code or ID is required.", 400);

  const action = req.body?.action as "ENTRY" | "EXIT" | undefined;
  const vehiclePlate = (req.body?.vehiclePlate as string) || null;
  const notes = (req.body?.notes as string) || null;

  const result = await confirmGateAccess(code, req.user!, req.clientIp ?? null, req.userAgent ?? null, {
    action,
    vehiclePlate,
    notes,
  });

  res.status(result.ok ? 200 : 400).json(result);
}));

// Deny access for a given code with a reason
router.post("/deny-access", authRequired(GATE as any), asyncH(async (req, res) => {
  const code = (req.body?.code as string) || "";
  const reason = (req.body?.reason as string) || "Access denied by security officer.";

  let residentId: string | null = null;
  let personType: "VISITOR" | "RESIDENT" = "VISITOR";

  if (code) {
    const verified = await verifyGatePass(code);
    if (verified.gatePass) {
      residentId = verified.gatePass.resident?.id ?? null;
      personType = verified.gatePass.passType === "VISITOR" ? "VISITOR" : "RESIDENT";
    }
  }

  const log = await recordDenied(
    req.user!,
    personType,
    { token: code, residentId, reason },
    req.clientIp ?? null,
    req.userAgent ?? null
  );

  res.json({ ok: true, logId: log.id, message: "Denied attempt logged." });
}));

// Officer shift statistics (entries, exits, denied, and recent logs for today)
router.get("/shift-stats", authRequired(GATE as any), asyncH(async (req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [enteredToday, exitedToday, deniedToday, recentLogs] = await Promise.all([
    prisma.accessLog.count({
      where: { action: "ENTRY", createdAt: { gte: todayStart } },
    }),
    prisma.accessLog.count({
      where: { action: "EXIT", createdAt: { gte: todayStart } },
    }),
    prisma.accessLog.count({
      where: { action: "DENIED", createdAt: { gte: todayStart } },
    }),
    prisma.accessLog.findMany({
      where: { createdAt: { gte: todayStart } },
      include: {
        resident: { select: { firstName: true, lastName: true, property: { select: { unitNumber: true } } } },
        visitor: { select: { fullName: true } },
        securityOfficer: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  res.json({
    stats: { enteredToday, exitedToday, deniedToday },
    recentLogs,
  });
}));

// ---------------- Legacy Gate Endpoints ----------------

router.post("/resolve", authRequired(GATE as any), asyncH(async (req, res) => {
  const qr = (req.body?.qr as string) || "";
  if (!qr) throw new ApiError("QR content is required.", 400);
  const result = await resolveVisitorQr(qr);
  if (!result.parsed) { res.json({ parsed: false, denied: true, reason: result.reason }); return; }
  const pass = result.pass;
  const visitor = pass?.visitor;
  const resident = visitor?.resident;
  const qrDataUrl = pass ? await renderQrDataUrl(pass.qrContent) : null;
  res.json({
    parsed: true,
    allowed: result.allowed,
    reason: result.allowed ? "" : result.reason,
    pass: pass ? { token: pass.token, status: pass.status, expiresAt: pass.expiresAt, usesCount: pass.usesCount, maxUses: pass.maxUses } : null,
    visitor: visitor ? {
      id: visitor.id, fullName: visitor.fullName, phone: visitor.phone, photoUrl: visitor.photoUrl,
      visitorType: visitor.visitorType, purpose: visitor.purpose, status: visitor.status,
      expectedArrival: visitor.expectedArrival, expectedDeparture: visitor.expectedDeparture, vehiclePlate: visitor.vehiclePlate,
    } : null,
    resident: resident ? { id: resident.id, name: `${resident.firstName} ${resident.lastName}`, phone: resident.phone, unitNumber: resident.property?.unitNumber ?? null } : null,
    qrDataUrl,
  });
}));

router.post("/check-in", authRequired(GATE as any), asyncH(async (req, res) => {
  const qr = (req.body?.qr as string) || "";
  const vehiclePlate = (req.body?.vehiclePlate as string) || null;
  if (!qr) throw new ApiError("QR content is required.", 400);
  const result = await visitorCheckIn(qr, req.user!, req.clientIp ?? null, req.userAgent ?? null, { vehiclePlate });
  res.status(result.ok ? 200 : 401).json(result);
}));

router.post("/check-out", authRequired(GATE as any), asyncH(async (req, res) => {
  const qr = (req.body?.qr as string) || "";
  let visitorId = (req.body?.visitorId as string) || null;
  if (!visitorId && qr) {
    const resolved = await resolveVisitorQr(qr);
    visitorId = resolved.pass?.visitor?.id ?? null;
    if (!visitorId) { res.status(401).json({ ok: false, reason: "Could not identify visitor from this pass." }); return; }
  }
  if (!visitorId) throw new ApiError("A visitor is required.", 400);
  const result = await visitorCheckOut(visitorId, req.user!, req.clientIp ?? null, req.userAgent ?? null);
  res.status(result.ok ? 200 : 400).json(result);
}));

router.post("/deny", authRequired(GATE as any), asyncH(async (req, res) => {
  const qr = (req.body?.qr as string) || "";
  const reason = (req.body?.reason as string) || "Access denied by officer.";
  const token = req.body?.token as string | undefined;
  let resolvedVisitorId: string | null = null;
  let resolvedResidentId: string | null = null;
  if (qr) {
    const r = await resolveVisitorQr(qr);
    resolvedVisitorId = r.pass?.visitor?.id ?? null;
    resolvedResidentId = r.pass?.visitor?.residentId ?? null;
  }
  const log = await recordDenied(req.user!, "VISITOR", { token, visitorId: resolvedVisitorId, residentId: resolvedResidentId, reason }, req.clientIp ?? null, req.userAgent ?? null);
  res.json({ ok: true, logId: log.id });
}));

export default router;

