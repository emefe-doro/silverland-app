import { Router } from "express";
import { prisma } from "../db";
import { renderQrDataUrl, generateSecureToken, qrContentForToken, generateUniqueGatePassCode, formatPassCode } from "../tokens";
import { notify } from "../notify";
import { writeAudit } from "../audit";
import { asyncH, ApiError } from "../guard";
import { authRequired } from "../middleware";

const router = Router();
const ALL = ["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER", "RESIDENT"];
const STAFF = ["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER"];

async function assertOwnership(user: any, residentId: string | null) {
  if (user.role === "RESIDENT" && residentId !== user.residentId) {
    throw new ApiError("Not allowed.", 403);
  }
}

router.get("/:id", authRequired(ALL as any), asyncH(async (req, res) => {
  const visitor = await prisma.visitor.findUnique({
    where: { id: req.params.id },
    include: {
      resident: { select: { id: true, firstName: true, lastName: true, property: true } },
      gatePasses: { orderBy: { createdAt: "desc" } },
      accessLogs: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!visitor) throw new ApiError("Visitor not found.", 404);
  await assertOwnership(req.user!, visitor.residentId);
  res.json({ visitor });
}));

router.delete("/:id", authRequired(ALL as any), asyncH(async (req, res) => {
  const visitor = await prisma.visitor.findUnique({ where: { id: req.params.id } });
  if (!visitor) throw new ApiError("Visitor not found.", 404);
  await assertOwnership(req.user!, visitor.residentId);
  await prisma.$transaction([
    prisma.gatePass.updateMany({ where: { visitorId: visitor.id }, data: { status: "CANCELLED" } }),
    prisma.visitor.update({ where: { id: visitor.id }, data: { status: "CANCELLED" } }),
  ]);
  await writeAudit({
    actor: req.user!, action: "VISITOR_CANCELLED", entityType: "Visitor", entityId: visitor.id,
    summary: `Cancelled visitor ${visitor.fullName}`,
    ip: req.clientIp ?? null, userAgent: req.userAgent ?? null,
  });
  res.json({ ok: true });
}));

router.post("/:id/approve", authRequired(STAFF as any), asyncH(async (req, res) => {
  const visitor = await prisma.visitor.findUnique({ where: { id: req.params.id }, include: { resident: { select: { userId: true } } } });
  if (!visitor) throw new ApiError("Visitor not found.", 404);
  await prisma.$transaction([
    prisma.visitor.update({ where: { id: visitor.id }, data: { status: "APPROVED" } }),
    prisma.gatePass.updateMany({ where: { visitorId: visitor.id }, data: { status: "ACTIVE" } }),
  ]);
  await notify([{ userId: visitor.resident?.userId ?? null }], {
    type: "VISITOR_APPROVAL", title: "Visitor approved",
    message: `${visitor.fullName} has been approved for entry.`,
    actorName: req.user!.name, link: "/resident/visitors",
  });
  await writeAudit({ actor: req.user!, action: "VISITOR_APPROVED", entityType: "Visitor", entityId: visitor.id, summary: `Approved visitor ${visitor.fullName}` });
  res.json({ ok: true, visitor });
}));

router.post("/:id/deny", authRequired(STAFF as any), asyncH(async (req, res) => {
  const reason = (req.body?.reason as string) || "Denied by estate officer.";
  const visitor = await prisma.visitor.findUnique({ where: { id: req.params.id }, include: { resident: { select: { userId: true } } } });
  if (!visitor) throw new ApiError("Visitor not found.", 404);
  await prisma.$transaction([
    prisma.visitor.update({ where: { id: visitor.id }, data: { status: "DENIED" } }),
    prisma.gatePass.updateMany({ where: { visitorId: visitor.id }, data: { status: "CANCELLED" } }),
  ]);
  await notify([{ userId: visitor.resident?.userId ?? null }], {
    type: "VISITOR_DENIED", title: "Visitor denied",
    message: `${visitor.fullName} was denied entry: ${reason}`,
    actorName: req.user!.name, link: "/resident/visitors",
  });
  await writeAudit({ actor: req.user!, action: "VISITOR_DENIED", entityType: "Visitor", entityId: visitor.id, summary: `Denied visitor ${visitor.fullName}: ${reason}` });
  res.json({ ok: true });
}));

router.post("/:id/expected", authRequired(ALL as any), asyncH(async (req, res) => {
  const expected = !!req.body?.expected;
  const visitor = await prisma.visitor.findUnique({ where: { id: req.params.id } });
  if (!visitor) throw new ApiError("Visitor not found.", 404);
  await assertOwnership(req.user!, visitor.residentId);
  const updated = await prisma.visitor.update({ where: { id: visitor.id }, data: { status: expected ? "EXPECTED" : "APPROVED" } });
  await writeAudit({ actor: req.user!, action: expected ? "VISITOR_MARKED_EXPECTED" : "VISITOR_MARKED_UNEXPECTED", entityType: "Visitor", entityId: visitor.id, summary: `${visitor.fullName} marked ${expected ? "expected" : "unexpected"}` });
  res.json({ ok: true, visitor: updated });
}));

router.get("/:id/pass", authRequired(ALL as any), asyncH(async (req, res) => {
  const visitor = await prisma.visitor.findUnique({ where: { id: req.params.id } });
  if (!visitor) throw new ApiError("Visitor not found.", 404);
  await assertOwnership(req.user!, visitor.residentId);
  const pass = await prisma.gatePass.findFirst({
    where: { visitorId: visitor.id },
    orderBy: { createdAt: "desc" },
  });
  if (!pass) throw new ApiError("No pass found for visitor.", 404);
  const qrDataUrl = await renderQrDataUrl(pass.qrContent);
  res.json({ pass: { ...pass, formattedCode: formatPassCode(pass.code) }, qrDataUrl });
}));

router.post("/:id/pass", authRequired(ALL as any), asyncH(async (req, res) => {
  const visitor = await prisma.visitor.findUnique({ where: { id: req.params.id } });
  if (!visitor) throw new ApiError("Visitor not found.", 404);
  await assertOwnership(req.user!, visitor.residentId);
  const settings = await prisma.estateSettings.findUnique({ where: { id: 1 } });
  const validityHours = settings?.visitorPassValidityHours ?? 24;
  const token = generateSecureToken();
  const code = await generateUniqueGatePassCode();

  // Cancel any existing active passes for this visitor
  await prisma.gatePass.updateMany({
    where: { visitorId: visitor.id, status: "ACTIVE" },
    data: { status: "CANCELLED" },
  });

  const pass = await prisma.gatePass.create({
    data: {
      code,
      token,
      qrContent: qrContentForToken(token),
      passType: "VISITOR",
      residentId: visitor.residentId!,
      visitorId: visitor.id,
      visitorName: visitor.fullName,
      visitorPhone: visitor.phone,
      visitorType: visitor.visitorType,
      vehiclePlate: visitor.vehiclePlate,
      purpose: visitor.purpose,
      direction: "ENTRY",
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + validityHours * 3600 * 1000),
      maxUses: 1,
    },
  });

  const qrDataUrl = await renderQrDataUrl(pass.qrContent);
  await writeAudit({ actor: req.user!, action: "VISITOR_PASS_REGENERATED", entityType: "GatePass", entityId: pass.id, summary: `New pass (${formatPassCode(code)}) for ${visitor.fullName}` });
  res.status(201).json({ pass: { ...pass, formattedCode: formatPassCode(code) }, qrDataUrl });
}));

export default router;
