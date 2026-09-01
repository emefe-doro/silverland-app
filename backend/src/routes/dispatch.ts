import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { generateSecureToken } from "../tokens";
import { notify } from "../notify";
import { writeAudit } from "../audit";
import { asyncH, ApiError } from "../guard";
import { authRequired } from "../middleware";

const router = Router();
const ALL = ["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER", "RESIDENT"];

router.get("/", authRequired(ALL as any), asyncH(async (req, res) => {
  const q = ((req.query.q as string) ?? "").trim();
  const status = (req.query.status as string) || "";
  const limit = Math.min(Number((req.query.limit as string) || 50), 200);
  const where: any = {};
  if (req.user!.role === "RESIDENT" && req.user!.residentId) where.residentId = req.user!.residentId;
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { riderName: { contains: q, mode: "insensitive" } },
      { company: { contains: q, mode: "insensitive" } },
      { riderPhone: { contains: q } },
      { orderReference: { contains: q, mode: "insensitive" } },
      { bikeNumber: { contains: q, mode: "insensitive" } },
    ];
  }
  const dispatch = await prisma.dispatchRider.findMany({ where, include: { resident: { include: { property: true } } }, orderBy: { createdAt: "desc" }, take: limit });
  const total = await prisma.dispatchRider.count({ where });
  res.json({ dispatch, total });
}));

const createSchema = z.object({
  residentId: z.string().optional().nullable(),
  riderName: z.string().min(1),
  riderPhone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  orderReference: z.string().optional().nullable(),
  deliveryUnit: z.string().optional().nullable(),
  bikeNumber: z.string().optional().nullable(),
  plateNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.post("/", authRequired(ALL as any), asyncH(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(parsed.error.issues[0].message, 400);
  const d = parsed.data;
  const user = req.user!;

  let residentId = d.residentId ?? null;
  if (user.role === "RESIDENT") {
    if (!user.residentId) throw new ApiError("Resident profile not linked.", 400);
    residentId = user.residentId;
  }

  const settings = await prisma.estateSettings.findUnique({ where: { id: 1 } });
  const requireConfirm = settings?.dispatchRequiresResidentConfirmation !== false;
  const token = generateSecureToken(14);
  const rider = await prisma.dispatchRider.create({
    data: {
      residentId,
      riderName: d.riderName,
      riderPhone: d.riderPhone ?? null,
      company: d.company ?? null,
      orderReference: d.orderReference ?? null,
      deliveryUnit: d.deliveryUnit ?? null,
      bikeNumber: d.bikeNumber ?? null,
      plateNumber: d.plateNumber ?? null,
      notes: d.notes ?? null,
      status: user.role === "RESIDENT" || !requireConfirm ? "APPROVED" : "PENDING",
      passToken: token,
      expiresAt: new Date(Date.now() + (settings?.dispatchValidityMinutes ?? 45) * 60 * 1000),
      registeredById: user.sub,
    },
  });

  const resident = await prisma.resident.findUnique({ where: { id: residentId ?? "__none__" }, select: { userId: true } });
  const targets: Array<{ userId?: string; role?: any }> = [];
  if (resident?.userId && user.role === "RESIDENT" && resident.userId !== user.sub) targets.push({ userId: resident.userId });
  if (user.role === "SECURITY_OFFICER") targets.push({ role: "SECURITY_OFFICER" });
  await notify(targets, {
    type: "DISPATCH_ARRIVAL", title: "Dispatch rider at the gate",
    message: `${d.riderName} (${d.company ?? "dispatch"}) delivering to a resident. Ref: ${d.orderReference ?? "n/a"}.`,
    actorName: user.name, link: "/dispatch",
  });

  await writeAudit({ actor: user, action: "DISPATCH_REGISTERED", entityType: "DispatchRider", entityId: rider.id, summary: `Registered rider ${d.riderName} (${d.company ?? "dispatch"})` });
  res.status(201).json({ rider });
}));

export default router;
