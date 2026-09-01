import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { hashPassword } from "../auth";
import { writeAudit } from "../audit";
import { asyncH, ApiError } from "../guard";
import { authRequired } from "../middleware";

const router = Router();

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER", "RESIDENT"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
  phone: z.string().optional().nullable(),
});

router.put("/:id", authRequired(["SUPER_ADMIN"]), asyncH(async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(parsed.error.issues[0].message, 400);
  const d = parsed.data;
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) throw new ApiError("User not found.", 404);
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { name: d.name, role: d.role as any, isActive: d.isActive, phone: d.phone, passwordHash: d.password ? await hashPassword(d.password) : undefined },
  });
  await writeAudit({ actor: req.user!, action: "USER_UPDATED", entityType: "User", entityId: user.id, summary: `Updated user ${user.email} (${user.name})` });
  res.json({ user });
}));

export default router;
