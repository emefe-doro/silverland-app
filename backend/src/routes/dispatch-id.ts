import { Router } from "express";
import { prisma } from "../db";
import { generateSecureToken } from "../tokens";
import { notify } from "../notify";
import { writeAudit } from "../audit";
import { asyncH, ApiError } from "../guard";
import { authRequired } from "../middleware";
import { registerEntryOfficerId } from "../gate-logic";

const router = Router();
const ALL = ["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER", "RESIDENT"];
const STAFF = ["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER"];

router.get("/:id", authRequired(ALL as any), asyncH(async (req, res) => {
  const rider = await prisma.dispatchRider.findUnique({
    where: { id: req.params.id },
    include: { resident: { include: { property: true } }, accessLogs: { orderBy: { createdAt: "desc" } } },
  });
  if (!rider) throw new ApiError("Dispatch rider not found.", 404);
  if (req.user!.role === "RESIDENT" && rider.residentId !== req.user!.residentId) throw new ApiError("Not allowed.", 403);
  res.json({ rider });
}));

router.post("/:id/refresh", authRequired(STAFF as any), asyncH(async (req, res) => {
  const rider = await prisma.dispatchRider.findUnique({ where: { id: req.params.id } });
  if (!rider) throw new ApiError("Not found.", 404);
  const token = generateSecureToken(14);
  const updated = await prisma.dispatchRider.update({
    where: { id: rider.id },
    data: { passToken: token, expiresAt: new Date(Date.now() + 45 * 60 * 1000), status: "PENDING" },
  });
  res.json({ rider: updated });
}));

router.post("/:id/confirm", authRequired(ALL as any), asyncH(async (req, res) => {
  const rider = await prisma.dispatchRider.findUnique({ where: { id: req.params.id } });
  if (!rider) throw new ApiError("Not found.", 404);
  if (req.user!.role === "RESIDENT" && rider.residentId !== req.user!.residentId) throw new ApiError("Not allowed.", 403);
  if (rider.expiresAt && new Date(rider.expiresAt).getTime() < Date.now()) {
    await writeAudit({ actor: req.user!, action: "DISPATCH_CONFIRMATION_EXPIRED", entityType: "DispatchRider", entityId: rider.id, summary: `Tried to confirm expired rider ${rider.riderName}` });
    throw new ApiError("Dispatch pass expired; please register again.", 400);
  }
  const updated = await prisma.dispatchRider.update({ where: { id: rider.id }, data: { status: "APPROVED", confirmedById: req.user!.sub } });
  await notify([{ role: "SECURITY_OFFICER" }], {
    type: "DISPATCH_ARRIVAL", title: "Dispatch rider approved",
    message: `${rider.riderName} approved by resident. You may allow entry.`,
    actorName: req.user!.name, link: "/dispatch",
  });
  await writeAudit({ actor: req.user!, action: "DISPATCH_CONFIRMED", entityType: "DispatchRider", entityId: rider.id, summary: `Confirmed rider ${rider.riderName}` });
  res.json({ ok: true, rider: updated });
}));

router.post("/:id/entry", authRequired(STAFF as any), asyncH(async (req, res) => {
  const rider = await prisma.dispatchRider.findUnique({ where: { id: req.params.id } });
  if (!rider) throw new ApiError("Not found.", 404);
  if (rider.status === "EXITED") { res.status(400).json({ ok: false, reason: "Rider already exited." }); return; }
  if (rider.status === "PENDING") { res.status(400).json({ ok: false, reason: "Rider is awaiting resident confirmation." }); return; }
  if (rider.expiresAt && new Date(rider.expiresAt).getTime() < Date.now()) {
    await prisma.dispatchRider.update({ where: { id: rider.id }, data: { status: "EXPIRED" } });
    res.status(401).json({ ok: false, reason: "Dispatch pass expired." }); return;
  }
  const existing = await prisma.accessLog.findFirst({ where: { dispatchId: rider.id, status: "INSIDE" } });
  if (existing) { res.status(400).json({ ok: false, reason: "Rider is already inside." }); return; }
  const property = await prisma.resident.findUnique({ where: { id: rider.residentId ?? "__none__" }, select: { propertyId: true } });
  const oid = await registerEntryOfficerId(req.user!);
  const log = await prisma.accessLog.create({
    data: {
      personType: "DISPATCH", dispatchId: rider.id, residentId: rider.residentId,
      propertyId: property?.propertyId ?? null, action: "ENTRY", status: "INSIDE",
      token: rider.passToken, securityOfficerId: oid,
      vehiclePlate: rider.bikeNumber ?? rider.plateNumber ?? null, source: "GATE",
    },
  });
  await prisma.dispatchRider.update({ where: { id: rider.id }, data: { status: "INSIDE" } });
  await writeAudit({ actor: req.user!, action: "DISPATCH_ENTRY", entityType: "DispatchRider", entityId: rider.id, summary: `Rider ${rider.riderName} entered (${rider.bikeNumber ?? ""})` });
  res.json({ ok: true, log });
}));

router.post("/:id/exit", authRequired(STAFF as any), asyncH(async (req, res) => {
  const rider = await prisma.dispatchRider.findUnique({ where: { id: req.params.id } });
  if (!rider) throw new ApiError("Not found.", 404);
  const openLog = await prisma.accessLog.findFirst({ where: { dispatchId: rider.id, status: "INSIDE" }, orderBy: { entryAt: "desc" } });
  if (!openLog) {
    await prisma.dispatchRider.update({ where: { id: rider.id }, data: { status: "EXITED" } });
    res.json({ ok: true, reason: "Marked exited (no open entry)." }); return;
  }
  const exitAt = new Date();
  const durationSeconds = Math.max(0, Math.round((exitAt.getTime() - openLog.entryAt.getTime()) / 1000));
  const log = await prisma.accessLog.update({ where: { id: openLog.id }, data: { action: "EXIT", status: "EXITED", exitAt, durationSeconds } });
  await prisma.dispatchRider.update({ where: { id: rider.id }, data: { status: "EXITED" } });
  await writeAudit({ actor: req.user!, action: "DISPATCH_EXIT", entityType: "DispatchRider", entityId: rider.id, summary: `Rider ${rider.riderName} exited (duration ${durationSeconds}s)` });
  res.json({ ok: true, log });
}));

export default router;
