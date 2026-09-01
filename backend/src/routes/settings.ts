import { Router } from "express";
import { prisma } from "../db";
import { writeAudit } from "../audit";
import { asyncH } from "../guard";
import { authRequired } from "../middleware";

const router = Router();

router.get("/", authRequired(["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER"]), asyncH(async (_req, res) => {
  const settings = await prisma.estateSettings.findUnique({ where: { id: 1 } });
  res.json({ settings });
}));

const ALLOWED = [
  "estateName", "estateSubtitle", "visitorPassValidityHours", "dispatchValidityMinutes",
  "maxVisitorDurationHours", "residentsMustApproveVisitors", "dispatchRequiresResidentConfirmation",
  "securityOfficerCanEditResidents", "securityOfficerCanOverrideDenied", "allowUnexpectedVisitors",
] as const;

router.put("/", authRequired(["SUPER_ADMIN"]), asyncH(async (req, res) => {
  const body = req.body ?? {};
  const data: any = {};
  for (const k of ALLOWED) if (k in body) data[k] = body[k];
  const settings = await prisma.estateSettings.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
  await writeAudit({ actor: req.user!, action: "SETTINGS_UPDATED", entityType: "EstateSettings", entityId: "1", summary: "Estate settings updated" });
  res.json({ settings });
}));

export default router;
