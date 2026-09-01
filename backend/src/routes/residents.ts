import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { hashPassword } from "../auth";
import { writeAudit } from "../audit";
import { asyncH, ApiError } from "../guard";
import { authRequired } from "../middleware";

const router = Router();

router.get("/", authRequired(["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER"]), asyncH(async (req, res) => {
  const q = ((req.query.q as string) ?? "").trim();
  const limit = Math.min(Number((req.query.limit as string) || 50), 200);
  const status = (req.query.status as string) || "";

  const where: any = {};
  if (status) where.propertyStatus = status;
  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const residents = await prisma.resident.findMany({
    where,
    include: { property: true, vehicles: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  const total = await prisma.resident.count({ where });
  res.json({ residents, total });
}));

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  propertyId: z.string().optional().nullable(),
  residentType: z.string().optional(),
  propertyStatus: z.string().optional(),
  unitNumber: z.string().optional(),
  createUser: z.boolean().optional(),
  userEmail: z.string().email().optional().nullable(),
  userPassword: z.string().min(6).optional().nullable(),
  notes: z.string().optional().nullable(),
  verified: z.boolean().optional(),
});

router.post("/", authRequired(["SUPER_ADMIN", "ESTATE_MANAGEMENT"]), asyncH(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(parsed.error.issues[0].message, 400);
  const d = parsed.data;

  let propertyId = d.propertyId ?? null;
  if (!propertyId && d.unitNumber) {
    const prop = await prisma.property.upsert({
      where: { unitNumber: d.unitNumber.toUpperCase() },
      update: {},
      create: { unitNumber: d.unitNumber.toUpperCase() },
    });
    propertyId = prop.id;
  }

  let userId: string | null = null;
  if (d.createUser && d.userEmail) {
    const existing = await prisma.user.findUnique({ where: { email: d.userEmail } });
    if (existing) userId = existing.id;
    else {
      const u = await prisma.user.create({
        data: { email: d.userEmail, name: `${d.firstName} ${d.lastName}`, phone: d.phone ?? null, role: "RESIDENT", passwordHash: await hashPassword(d.userPassword || "Resident@123") },
      });
      userId = u.id;
    }
  }

  const resident = await prisma.resident.create({
    data: {
      firstName: d.firstName, lastName: d.lastName, phone: d.phone ?? null, email: d.email ?? null,
      propertyId, residentType: (d.residentType as any) ?? "OWNER",
      propertyStatus: (d.propertyStatus as any) ?? "ACTIVE",
      userId, verified: d.verified ?? false, source: "MANUAL", notes: d.notes ?? null,
    },
  });
  await writeAudit({ actor: req.user!, action: "RESIDENT_CREATED", entityType: "Resident", entityId: resident.id, summary: `${resident.firstName} ${resident.lastName} added` });
  res.status(201).json({ resident });
}));

export default router;
