import { Router } from "express";
import { resolveVisitorQr, visitorCheckIn, visitorCheckOut, recordDenied } from "../gate-logic";
import { renderQrDataUrl } from "../tokens";
import { asyncH, ApiError } from "../guard";
import { authRequired } from "../middleware";

const router = Router();
const GATE = ["SUPER_ADMIN", "SECURITY_OFFICER"];

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
