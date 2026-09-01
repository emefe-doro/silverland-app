import { Router } from "express";
import { prisma } from "../db";
import { asyncH } from "../guard";
import { authRequired } from "../middleware";

const router = Router();

router.get("/", authRequired(["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER"]), asyncH(async (req, res) => {
  const q = ((req.query.q as string) ?? "").trim();
  const personType = (req.query.personType as string) || "";
  const status = (req.query.status as string) || "";
  const action = (req.query.action as string) || "";
  const date = (req.query.date as string) || "";
  const residentId = (req.query.residentId as string) || "";
  const limit = Math.min(Number((req.query.limit as string) || 50), 200);

  const where: any = {};
  if (personType) where.personType = personType;
  if (status) where.status = status;
  if (action) where.action = action;
  if (residentId) where.residentId = residentId;
  if (date) {
    const d = new Date(date);
    const start = new Date(d.setHours(0, 0, 0, 0));
    const end = new Date(d.setHours(23, 59, 59, 999));
    where.OR = [{ entryAt: { gte: start, lte: end } }, { createdAt: { gte: start, lte: end } }];
  }
  if (q) {
    where.AND = [{
      OR: [
        { visitor: { fullName: { contains: q, mode: "insensitive" } } },
        { visitor: { phone: { contains: q } } },
        { dispatch: { riderName: { contains: q, mode: "insensitive" } } },
        { dispatch: { company: { contains: q, mode: "insensitive" } } },
        { resident: { firstName: { contains: q, mode: "insensitive" } } },
        { resident: { lastName: { contains: q, mode: "insensitive" } } },
        { vehiclePlate: { contains: q, mode: "insensitive" } },
      ],
    }];
  }

  const logs = await prisma.accessLog.findMany({
    where,
    include: {
      visitor: true, dispatch: true,
      resident: { include: { property: true } },
      securityOfficer: { select: { id: true, name: true, badgeNumber: true } },
      property: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  const total = await prisma.accessLog.count({ where });
  res.json({ logs, total });
}));

export default router;
