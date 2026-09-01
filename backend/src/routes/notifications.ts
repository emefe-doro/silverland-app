import { Router } from "express";
import { prisma } from "../db";
import { asyncH } from "../guard";
import { authRequired } from "../middleware";

const router = Router();

router.get("/", authRequired(["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER", "RESIDENT"]), asyncH(async (req, res) => {
  const unreadOnly = req.query.unread === "true";
  const limit = Math.min(Number((req.query.limit as string) || 50), 100);
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.sub, ...(unreadOnly ? { readAt: null } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  const unread = await prisma.notification.count({ where: { userId: req.user!.sub, readAt: null } });
  res.json({ notifications, unread });
}));

router.post("/", authRequired(["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER", "RESIDENT"]), asyncH(async (req, res) => {
  const ids = req.body?.ids as string[] | undefined;
  const now = new Date();
  if (ids && ids.length) {
    await prisma.notification.updateMany({ where: { userId: req.user!.sub, id: { in: ids } }, data: { readAt: now } });
  } else {
    await prisma.notification.updateMany({ where: { userId: req.user!.sub }, data: { readAt: now } });
  }
  res.json({ ok: true });
}));

export default router;
