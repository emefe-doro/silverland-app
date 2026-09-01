import { Router } from "express";
import { prisma } from "../db";
import { asyncH } from "../guard";
import { authRequired } from "../middleware";

const router = Router();

function bucket(date: Date, group: string) {
  if (group === "week") {
    const d = new Date(date); d.setHours(0, 0, 0, 0);
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    return d.toISOString().slice(0, 10);
  }
  if (group === "month") {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return date.toISOString().slice(0, 10);
}

router.get("/", authRequired(["SUPER_ADMIN", "ESTATE_MANAGEMENT"]), asyncH(async (req, res) => {
  const days = Number((req.query.days as string) || 7);
  const to = new Date();
  const from = new Date(to.getTime() - days * 86400000);
  const type = (req.query.type as string) || "all";
  const group = (req.query.group as string) || "day";

  const where: any = { createdAt: { gte: from, lte: to } };
  if (type === "visitors") where.personType = "VISITOR";
  else if (type === "dispatch") where.personType = "DISPATCH";

  const logs = await prisma.accessLog.findMany({
    where,
    select: { createdAt: true, entryAt: true, exitAt: true, action: true, status: true, personType: true, vehiclePlate: true },
  });

  const map = new Map<string, any>();
  for (const l of logs) {
    const key = bucket(l.createdAt, group);
    const cur = map.get(key) ?? { total: 0, entered: 0, exited: 0, denied: 0, dispatch: 0, vehicles: 0 };
    cur.total++;
    if (l.action === "ENTRY") cur.entered++;
    if (l.action === "EXIT") cur.exited++;
    if (l.action === "DENIED") cur.denied++;
    if (l.personType === "DISPATCH") cur.dispatch++;
    if (l.vehiclePlate) cur.vehicles++;
    map.set(key, cur);
  }
  const series = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([label, v]) => ({ label, ...v }));

  const totals = Array.from(map.values()).reduce(
    (acc, v) => ({ total: acc.total + v.total, entered: acc.entered + v.entered, exited: acc.exited + v.exited, denied: acc.denied + v.denied, dispatch: acc.dispatch + v.dispatch, vehicles: acc.vehicles + v.vehicles }),
    { total: 0, entered: 0, exited: 0, denied: 0, dispatch: 0, vehicles: 0 }
  );

  res.json({ from, to, group, type, series, totals });
}));

export default router;
