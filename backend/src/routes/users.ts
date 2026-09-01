import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { hashPassword } from "../auth";
import { writeAudit } from "../audit";
import { asyncH, ApiError } from "../guard";
import { authRequired } from "../middleware";
import { ROLE_LABEL } from "../constants";

const router = Router();

router.get("/", authRequired(["SUPER_ADMIN"]), asyncH(async (_req, res) => {
  const users = await prisma.user.findMany({
    include: {
      resident: { select: { id: true, firstName: true, lastName: true } },
      securityOfficer: { select: { id: true, badgeNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ users });
}));

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER", "RESIDENT"]),
  password: z.string().min(6),
  phone: z.string().optional().nullable(),
});

router.post("/", authRequired(["SUPER_ADMIN"]), asyncH(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(parsed.error.issues[0].message, 400);
  const d = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email: d.email.toLowerCase() } });
  if (existing) throw new ApiError("Email already in use.", 409);

  const user = await prisma.user.create({
    data: { email: d.email.toLowerCase(), name: d.name, role: d.role as any, phone: d.phone ?? null, passwordHash: await hashPassword(d.password) },
  });
  if (d.role === "SECURITY_OFFICER") {
    const count = await prisma.securityOfficer.count();
    await prisma.securityOfficer.create({ data: { userId: user.id, badgeNumber: `SLV-${String(count + 1).padStart(3, "0")}`, name: d.name, station: "Main Gate" } });
  }
  await writeAudit({ actor: req.user!, action: "USER_CREATED", entityType: "User", entityId: user.id, summary: `Created ${d.name} (${ROLE_LABEL[d.role]})` });
  res.status(201).json({ user });
}));

export default router;
