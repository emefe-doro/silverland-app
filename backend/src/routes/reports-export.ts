import { Router } from "express";
import { prisma } from "../db";
import { asyncH } from "../guard";
import { authRequired } from "../middleware";

const router = Router();

router.get("/", authRequired(["SUPER_ADMIN", "ESTATE_MANAGEMENT"]), asyncH(async (req, res) => {
  const format = (req.query.format as string) || "csv";
  const personType = (req.query.personType as string) || "";
  const action = (req.query.action as string) || "";
  const status = (req.query.status as string) || "";
  const date = (req.query.date as string) || "";

  const where: any = {};
  if (personType) where.personType = personType;
  if (action) where.action = action;
  if (status) where.status = status;
  if (date) {
    const d = new Date(date);
    const start = new Date(d.setHours(0, 0, 0, 0));
    const end = new Date(d.setHours(23, 59, 59, 999));
    where.OR = [{ entryAt: { gte: start, lte: end } }, { createdAt: { gte: start, lte: end } }];
  }

  const logs = await prisma.accessLog.findMany({
    where,
    include: {
      visitor: { select: { fullName: true, phone: true } },
      dispatch: { select: { riderName: true, company: true } },
      resident: { select: { firstName: true, lastName: true } },
      property: { select: { unitNumber: true } },
      securityOfficer: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });

  const header = ["Date", "Type", "Person", "Resident / Unit", "Vehicle Plate", "Action", "Status", "Officer", "Duration (s)", "Reason / Notes"];
  const rows = logs.map((l: any) => [
    l.entryAt?.toISOString().slice(0, 16) ?? l.createdAt.toISOString().slice(0, 16),
    l.personType,
    l.visitor?.fullName ?? l.dispatch?.riderName ?? (l.dispatch ? `${l.dispatch.riderName} (${l.dispatch.company ?? "dispatch"})` : ""),
    l.resident ? `${l.resident.firstName} ${l.resident.lastName}${l.property ? " / " + l.property.unitNumber : ""}` : "",
    l.vehiclePlate ?? "", l.action, l.status, l.securityOfficer?.name ?? "", l.durationSeconds ?? "", l.reason ?? l.notes ?? "",
  ]);

  const filename = `silverland-report-${new Date().toISOString().slice(0, 10)}.${format}`;

  if (format === "csv") {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
    return;
  }

  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("Silverland Zone — Access Control Report", 14, 15);
  doc.setFontSize(9);
  doc.text(`Generated ${new Date().toLocaleString()} — ${logs.length} records`, 14, 21);
  autoTable(doc, { head: [header], body: rows as any, startY: 26, styles: { fontSize: 7 }, headStyles: { fillColor: [11, 59, 124] } });
  const out = doc.output("arraybuffer");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(Buffer.from(out));
}));

export default router;
