import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { hashPassword } from "../auth";
import { writeAudit } from "../audit";
import { asyncH, ApiError } from "../guard";
import { authRequired } from "../middleware";

const router = Router();

router.get("/", authRequired(["SUPER_ADMIN", "ESTATE_MANAGEMENT"]), asyncH(async (_req, res) => {
  const officers = await prisma.securityOfficer.findMany({
    include: { user: { select: { email: true, isActive: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json({ officers });
}));

const createSchema = z.object({
  name: z.string().min(1),
  badgeNumber: z.string().min(1),
  station: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  password: z.string().min(6).optional().nullable(),
});

router.post("/", authRequired(["SUPER_ADMIN", "ESTATE_MANAGEMENT"]), asyncH(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(parsed.error.issues[0].message, 400);
  const d = parsed.data;
  const badgeExists = await prisma.securityOfficer.findUnique({ where: { badgeNumber: d.badgeNumber } });
  if (badgeExists) throw new ApiError("Badge number already exists.", 409);

  let userId: string | null = null;
  if (d.email) {
    const existingUser = await prisma.user.findUnique({ where: { email: d.email.toLowerCase() } });
    if (existingUser) userId = existingUser.id;
    else {
      const u = await prisma.user.create({ data: { email: d.email.toLowerCase(), name: d.name, role: "SECURITY_OFFICER", passwordHash: await hashPassword(d.password || "Officer@123") } });
      userId = u.id;
    }
  }
  const officer = await prisma.securityOfficer.create({ data: { userId, badgeNumber: d.badgeNumber, station: d.station ?? null, name: d.name } });
  await writeAudit({ actor: req.user!, action: "OFFICER_CREATED", entityType: "SecurityOfficer", entityId: officer.id, summary: `Added officer ${d.name} (${d.badgeNumber})` });
  res.status(201).json({ officer });
}));

export default router;
