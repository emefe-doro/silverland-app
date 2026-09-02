import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { writeAudit } from "../audit";
import { asyncH, ApiError } from "../guard";
import { authRequired } from "../middleware";

const router = Router();

router.get("/", authRequired(["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER"]), asyncH(async (req, res) => {
  const vehicles = await prisma.vehicle.findMany({
    where: { isActive: true },
    include: { resident: { include: { property: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json({ vehicles });
}));

const createSchema = z.object({
  residentId: z.string().optional().nullable(),
  plateNumber: z.string().min(1),
  make: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.post("/", authRequired(["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER"]), asyncH(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(parsed.error.issues[0].message, 400);
  const d = parsed.data;

  const existing = await prisma.vehicle.findFirst({ where: { plateNumber: d.plateNumber.toUpperCase() } });
  if (existing) throw new ApiError("A vehicle with this plate number already exists.", 409);

  const vehicle = await prisma.vehicle.create({
    data: {
      residentId: d.residentId ?? null,
      plateNumber: d.plateNumber.toUpperCase(),
      make: d.make ?? null,
      color: d.color ?? null,
      type: d.type ?? null,
      notes: d.notes ?? null,
    },
    include: { resident: { include: { property: true } } },
  });

  await writeAudit({
    actor: req.user!, action: "VEHICLE_ADDED", entityType: "Vehicle", entityId: vehicle.id,
    summary: `Added vehicle ${vehicle.plateNumber}${vehicle.resident ? ` for ${vehicle.resident.firstName} ${vehicle.resident.lastName}` : ""}`,
    ip: req.clientIp ?? null, userAgent: req.userAgent ?? null,
  });

  res.status(201).json({ vehicle });
}));

export default router;
