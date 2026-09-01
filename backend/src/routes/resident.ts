import { Router } from "express";
import { prisma } from "../db";
import { asyncH, ApiError } from "../guard";
import { authRequired } from "../middleware";

const router = Router();

router.get("/profile", authRequired(["RESIDENT"]), asyncH(async (req, res) => {
  const user = req.user!;
  if (!user.residentId) throw new ApiError("No resident profile linked.", 404);
  const resident = await prisma.resident.findUnique({
    where: { id: user.residentId },
    include: {
      property: true,
      vehicles: true,
      user: { select: { email: true, phone: true, isActive: true } },
    },
  });
  if (!resident) throw new ApiError("Resident not found.", 404);
  const visitors = await prisma.visitor.count({ where: { residentId: resident.id } });
  const riders = await prisma.dispatchRider.count({ where: { residentId: resident.id } });
  res.json({ resident, stats: { visitors, riders } });
}));

router.get("/history", authRequired(["RESIDENT"]), asyncH(async (req, res) => {
  const user = req.user!;
  if (!user.residentId) throw new ApiError("No resident profile.", 404);
  const [accessLogs, visitors, riders] = await Promise.all([
    prisma.accessLog.findMany({
      where: { residentId: user.residentId },
      include: { visitor: { select: { fullName: true } }, dispatch: { select: { riderName: true, company: true } }, property: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.visitor.findMany({
      where: { residentId: user.residentId },
      include: { passes: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.dispatchRider.findMany({ where: { residentId: user.residentId }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  res.json({ accessLogs, visitors, riders });
}));

export default router;
