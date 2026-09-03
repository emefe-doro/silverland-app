import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { generateSecureToken, qrContentForToken, generateUniqueGatePassCode } from "../tokens";
import { notify } from "../notify";
import { writeAudit } from "../audit";
import { asyncH, ApiError } from "../guard";
import { authRequired } from "../middleware";
import { toDate } from "../gate-logic";
import { VISITOR_TYPE_LABEL } from "../constants";

const router = Router();
const STAFF_AND_RESIDENT = ["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER", "RESIDENT"];

router.get("/", authRequired(STAFF_AND_RESIDENT as any), asyncH(async (req, res) => {
  const user = req.user!;
  const q = ((req.query.q as string) ?? "").trim();
  const status = (req.query.status as string) || "";
  const type = (req.query.type as string) || "";
  const limit = Math.min(Number((req.query.limit as string) || 50), 200);

  const where: any = {};
  if (user.role === "RESIDENT" && user.residentId) where.residentId = user.residentId;
  if (status) where.status = status;
  if (type) where.visitorType = type;
  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { vehiclePlate: { contains: q, mode: "insensitive" } },
      { purpose: { contains: q, mode: "insensitive" } },
    ];
  }

  const visitors = await prisma.visitor.findMany({
    where,
    include: {
      resident: { select: { id: true, firstName: true, lastName: true, property: true } },
      gatePasses: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  const total = await prisma.visitor.count({ where });
  res.json({ visitors, total });
}));

const createSchema = z.object({
  fullName: z.string().min(1, "Full name required"),
  phone: z.string().optional().nullable(),
  visitorType: z.enum(["GUEST", "FAMILY", "DELIVERY", "SERVICE", "CONTRACTOR", "OTHER"]).default("GUEST"),
  purpose: z.string().optional().nullable(),
  residentId: z.string().optional().nullable(),
  expectedDate: z.string().optional().nullable(),
  expectedArrival: z.string().optional().nullable(),
  expectedDeparture: z.string().optional().nullable(),
  vehicleType: z.string().optional().nullable(),
  vehiclePlate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.post("/", authRequired(STAFF_AND_RESIDENT as any), asyncH(async (req, res) => {
  const user = req.user!;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(parsed.error.issues[0].message, 400);
  const d = parsed.data;

  let residentId = d.residentId ?? null;
  if (user.role === "RESIDENT") {
    if (!user.residentId) throw new ApiError("No resident profile linked to this user.", 403);
    residentId = user.residentId;
  }
  if (!residentId) throw new ApiError("Resident ID required.", 400);

  const settings = await prisma.estateSettings.findUnique({ where: { id: 1 } });
  const approvalRequired = (settings?.residentsMustApproveVisitors ?? false) && user.role !== "RESIDENT";

  const visitor = await prisma.visitor.create({
    data: {
      residentId,
      fullName: d.fullName,
      phone: d.phone ?? null,
      visitorType: d.visitorType as any,
      purpose: d.purpose ?? null,
      expectedDate: toDate(d.expectedDate),
      expectedArrival: toDate(d.expectedArrival),
      expectedDeparture: toDate(d.expectedDeparture),
      vehicleType: d.vehicleType ?? null,
      vehiclePlate: d.vehiclePlate ?? null,
      notes: d.notes ?? null,
      status: approvalRequired ? "PENDING" : "APPROVED",
      registeredById: user.sub,
    },
  });

  const validityHours = settings?.visitorPassValidityHours ?? 24;
  const token = generateSecureToken();
  const code = await generateUniqueGatePassCode();
  const pass = await prisma.gatePass.create({
    data: {
      code,
      token,
      qrContent: qrContentForToken(token),
      passType: "VISITOR",
      residentId,
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

  const res2 = await prisma.resident.findUnique({ where: { id: residentId }, select: { userId: true } });
  await notify([{ userId: res2?.userId ?? null }], {
    type: approvalRequired ? "VISITOR_APPROVAL" : "VISITOR_ARRIVAL",
    title: approvalRequired ? "New visitor awaiting approval" : "A visitor is expected",
    message: `${d.fullName} (${VISITOR_TYPE_LABEL[d.visitorType ?? "GUEST"] ?? "Visitor"}) — ${d.purpose ?? "visit"}.`,
    actorName: user.name,
    link: "/resident/visitors",
  });

  await writeAudit({
    actor: user, action: "VISITOR_REGISTERED", entityType: "Visitor", entityId: visitor.id,
    summary: `Registered visitor ${d.fullName}`,
    ip: req.clientIp ?? null, userAgent: req.userAgent ?? null,
  });

  res.status(201).json({ visitor, pass });
}));

export default router;
