import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { writeAudit } from "../audit";
import { asyncH, ApiError } from "../guard";
import { authRequired } from "../middleware";

const router = Router();

router.get("/:id", authRequired(["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER"]), asyncH(async (req, res) => {
  const resident = await prisma.resident.findUnique({
    where: { id: req.params.id },
    include: {
      property: true,
      vehicles: true,
      user: { select: { id: true, email: true, name: true, role: true, isActive: true } },
      visitors: { orderBy: { createdAt: "desc" }, take: 10 },
      accessLogs: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!resident) throw new ApiError("Resident not found.", 404);
  res.json({ resident });
}));

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  propertyId: z.string().optional().nullable(),
  residentType: z.string().optional(),
  propertyStatus: z.string().optional(),
  notes: z.string().optional().nullable(),
  verified: z.boolean().optional(),
});

router.put("/:id", authRequired(["SUPER_ADMIN", "ESTATE_MANAGEMENT"]), asyncH(async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(parsed.error.issues[0].message, 400);
  const d = parsed.data;
  const resident = await prisma.resident.update({
    where: { id: req.params.id },
    data: {
      firstName: d.firstName, lastName: d.lastName, phone: d.phone, email: d.email,
      propertyId: d.propertyId, residentType: d.residentType as any,
      propertyStatus: d.propertyStatus as any, notes: d.notes, verified: d.verified,
    },
  });
  await writeAudit({ actor: req.user!, action: "RESIDENT_UPDATED", entityType: "Resident", entityId: resident.id, summary: `${resident.firstName} ${resident.lastName} updated` });
  res.json({ resident });
}));

export default router;
