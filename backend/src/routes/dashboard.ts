import { Router } from "express";
import { prisma } from "../db";
import { asyncH } from "../guard";
import { authRequired } from "../middleware";

const router = Router();

function startOfDay() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function endOfDay() { const d = new Date(); d.setHours(23, 59, 59, 999); return d; }

router.get("/", authRequired(["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER", "RESIDENT"]), asyncH(async (req, res) => {
  const user = req.user!;
  const [start, end] = [startOfDay(), endOfDay()];
  const isResident = user.role === "RESIDENT";
  const residentFilter = isResident && user.residentId ? { residentId: user.residentId } : {};

  const [totalResidents, visitorsInside, dispatchInside, vehiclesInside, expectedToday, exitedToday, deniedToday] = await Promise.all([
    prisma.resident.count({ where: { propertyStatus: "ACTIVE" } }),
    prisma.accessLog.count({ where: { personType: "VISITOR", status: "INSIDE", ...residentFilter } }),
    prisma.accessLog.count({ where: { personType: "DISPATCH", status: "INSIDE", ...residentFilter } }),
    prisma.accessLog.count({ where: { status: "INSIDE", NOT: { vehiclePlate: null }, ...residentFilter } }),
    prisma.visitor.count({ where: { ...(isResident ? { residentId: user.residentId as string } : {}), expectedDate: { gte: start, lte: end } } }),
    prisma.accessLog.count({ where: { ...residentFilter, action: "EXIT", exitAt: { gte: start, lte: end } } }),
    prisma.accessLog.count({ where: { ...residentFilter, action: "DENIED", createdAt: { gte: start, lte: end } } }),
  ]);

  const visitorsInsideList = isResident
    ? []
    : await prisma.accessLog.findMany({
        where: { personType: "VISITOR", status: "INSIDE" },
        include: { visitor: true, resident: true, dispatch: true, securityOfficer: { select: { name: true } } },
        orderBy: { entryAt: "desc" },
        take: 8,
      });

  const recentAccess = await prisma.accessLog.findMany({
    where: isResident ? { ...residentFilter } : {},
    include: { visitor: true, resident: true },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const recentAlerts = await prisma.notification.findMany({
    where: { type: "SECURITY_ALERT" },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  res.json({
    stats: { totalResidents, visitorsInside, dispatchInside, vehiclesInside, expectedToday, exitedToday, deniedToday },
    visitorsInsideList, recentAccess, recentAlerts,
  });
}));

export default router;
