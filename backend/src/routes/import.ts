import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { writeAudit } from "../audit";
import { asyncH, ApiError } from "../guard";
import { authRequired } from "../middleware";

const router = Router();

const itemSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional().default(""),
  phone: z.string().optional().nullable(),
  unitNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
const schema = z.object({ items: z.array(itemSchema).min(1) });

// Import/verify handwritten notebook records as UNVERIFIED residents.
router.post("/", authRequired(["SUPER_ADMIN", "ESTATE_MANAGEMENT"]), asyncH(async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(parsed.error.issues[0].message, 400);

  let created = 0;
  for (const it of parsed.data.items) {
    if (!it.firstName) continue;
    let propertyId: string | null = null;
    if (it.unitNumber) {
      const prop = await prisma.property.upsert({ where: { unitNumber: it.unitNumber.toUpperCase() }, update: {}, create: { unitNumber: it.unitNumber.toUpperCase() } });
      propertyId = prop.id;
    }
    await prisma.resident.create({
      data: {
        firstName: it.firstName,
        lastName: it.lastName || "",
        phone: it.phone ?? null,
        propertyId,
        source: "NOTEBOOK_IMPORT",
        verified: false,
        notes: it.notes || "Imported from handwritten notebook record (pending verification).",
      },
    });
    created++;
  }
  await writeAudit({ actor: req.user!, action: "NOTEBOOK_IMPORT", entityType: "Resident", summary: `Imported ${created} record(s) from notebook (unverified)` });
  res.status(201).json({ created });
}));

export default router;
