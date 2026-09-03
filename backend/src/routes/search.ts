import { Router } from "express";
import { prisma } from "../db";
import { asyncH } from "../guard";
import { authRequired } from "../middleware";

const router = Router();

router.get("/", authRequired(["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER"]), asyncH(async (req, res) => {
  const q = ((req.query.q as string) ?? "").trim();
  if (!q) { res.json({ q, visitors: [], residents: [], riders: [], vehicles: [] }); return; }
  const limit = Math.min(Number((req.query.limit as string) || 10), 20);

  const [visitors, residents, riders, vehicles] = await Promise.all([
    prisma.visitor.findMany({
      where: { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { vehiclePlate: { contains: q, mode: "insensitive" } }] },
      include: { resident: { include: { property: true } }, gatePasses: { orderBy: { createdAt: "desc" }, take: 1 } },
      take: limit,
    }),
    prisma.resident.findMany({
      where: { OR: [{ firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { property: { unitNumber: { contains: q, mode: "insensitive" } } }] },
      include: { property: true, vehicles: true },
      take: limit,
    }),
    prisma.dispatchRider.findMany({
      where: { OR: [{ riderName: { contains: q, mode: "insensitive" } }, { riderPhone: { contains: q } }, { bikeNumber: { contains: q, mode: "insensitive" } }, { plateNumber: { contains: q, mode: "insensitive" } }, { orderReference: { contains: q, mode: "insensitive" } }] },
      include: { resident: { include: { property: true } } },
      take: limit,
    }),
    prisma.vehicle.findMany({ where: { plateNumber: { contains: q, mode: "insensitive" } }, include: { resident: true }, take: limit }),
  ]);

  res.json({ q, visitors, residents, riders, vehicles });
}));

export default router;
