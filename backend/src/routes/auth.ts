import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { verifyPassword, signToken, SessionUser } from "../auth";
import { writeAudit } from "../audit";
import { asyncH, ApiError } from "../guard";
import { authRequired } from "../middleware";

const router = Router();

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

router.post(
  "/login",
  asyncH(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError("Invalid email or password.", 400);
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        resident: { select: { id: true } },
        securityOfficer: { select: { id: true } },
      },
    });

    if (!user || !user.isActive) {
      await writeAudit({
        actor: null, action: "LOGIN_FAILED", entityType: "User",
        summary: `Failed login attempt for ${email}`,
        ip: req.clientIp ?? null, userAgent: req.userAgent ?? null,
      });
      throw new ApiError("Invalid credentials.", 401);
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      await writeAudit({
        actor: null, action: "LOGIN_FAILED", entityType: "User",
        summary: `Failed login attempt for ${email}`,
        ip: req.clientIp ?? null, userAgent: req.userAgent ?? null,
      });
      throw new ApiError("Invalid credentials.", 401);
    }

    const sessionUser: SessionUser = {
      sub: user.id, role: user.role, name: user.name, email: user.email,
      residentId: user.resident?.id ?? null,
      officerId: user.securityOfficer?.id ?? null,
    };
    const token = await signToken(sessionUser);
    await writeAudit({
      actor: sessionUser, action: "LOGIN", entityType: "User", entityId: user.id,
      summary: "User logged in",
      ip: req.clientIp ?? null, userAgent: req.userAgent ?? null,
    });

    const redirectTo = user.role === "RESIDENT" ? "/resident/dashboard" : "/dashboard";
    res.json({ ok: true, token, user: sessionUser, redirectTo });
  })
);

router.post(
  "/logout",
  authRequired(),
  asyncH(async (req, res) => {
    await writeAudit({
      actor: req.user!, action: "LOGOUT", entityType: "User", entityId: req.user!.sub,
      summary: "User logged out",
    });
    res.json({ ok: true });
  })
);

router.get(
  "/session",
  authRequired(),
  asyncH(async (req, res) => {
    res.json({ user: req.user });
  })
);

export default router;
