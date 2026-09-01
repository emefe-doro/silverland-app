import { Router } from "express";
import { prisma } from "../db";
import { asyncH } from "../guard";
import { authRequired } from "../middleware";

const router = Router();

router.get("/", authRequired(["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER"]), asyncH(async (req, res) => {
  const vehicles = await prisma.vehicle.findMany({
    where: { isActive: true },
    include: { resident: { include: { property: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json({ vehicles });
}));

export default router;
