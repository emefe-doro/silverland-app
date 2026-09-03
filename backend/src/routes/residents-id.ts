import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { writeAudit } from "../audit";
import { asyncH, ApiError } from "../guard";
import { authRequired } from "../middleware";

const router = Router();

router.get("/:id", authRequired(["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER"]), asyncH(async (req, res) => {
  const resident = await prisma.resident.findUnique({
    where: { id: req.params.id },
    include: {
      property: true,
      vehicles: true,
      user: { select: { id: true, email: true, name: true, role: true, isActive: true } },
      visitors: { orderBy: { createdAt: "desc" }, take: 10 },
      gatePasses: { orderBy: { createdAt: "desc" }, take: 10 },
      accessLogs: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!resident) throw new ApiError("Resident not found.", 404);
  res.json({ resident });
}));

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  propertyId: z.string().optional().nullable(),
  residentType: z.string().optional(),
  propertyStatus: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  notes: z.string().optional().nullable(),
  verified: z.boolean().optional(),
});

router.put("/:id", authRequired(["SUPER_ADMIN", "ESTATE_MANAGEMENT"]), asyncH(async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(parsed.error.issues[0].message, 400);
  const d = parsed.data;
  const resident = await prisma.resident.update({
    where: { id: req.params.id },
    data: {
      firstName: d.firstName,
      lastName: d.lastName,
      phone: d.phone,
      email: d.email,
      propertyId: d.propertyId,
      residentType: d.residentType as any,
      propertyStatus: d.propertyStatus as any,
      notes: d.notes,
      verified: d.verified,
    },
    include: { property: true, user: true },
  });

  // If status is changed to SUSPENDED, revoke active passes & disable user
  if (d.propertyStatus === "SUSPENDED") {
    await prisma.gatePass.updateMany({
      where: { residentId: resident.id, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });
    if (resident.userId) {
      await prisma.user.update({
        where: { id: resident.userId },
        data: { isActive: false },
      });
    }
  } else if (d.propertyStatus === "ACTIVE" && resident.userId) {
    await prisma.user.update({
      where: { id: resident.userId },
      data: { isActive: true },
    });
  }

  await writeAudit({
    actor: req.user!,
    action: "RESIDENT_UPDATED",
    entityType: "Resident",
    entityId: resident.id,
    summary: `${resident.firstName} ${resident.lastName} updated (status: ${resident.propertyStatus})`,
  });
  res.json({ resident });
}));

// Suspend Resident Access (e.g. Unpaid Monthly Dues)
router.post("/:id/suspend-access", authRequired(["SUPER_ADMIN", "ESTATE_MANAGEMENT"]), asyncH(async (req, res) => {
  const { reason } = req.body || {};
  const resident = await prisma.resident.findUnique({ where: { id: req.params.id } });
  if (!resident) throw new ApiError("Resident not found.", 404);

  const updated = await prisma.resident.update({
    where: { id: req.params.id },
    data: {
      propertyStatus: "SUSPENDED",
      notes: reason ? `${resident.notes ? resident.notes + "\n" : ""}[SUSPENDED - ${new Date().toLocaleDateString()}]: ${reason}` : resident.notes,
    },
    include: { property: true, user: true },
  });

  // Automatically cancel all active gate passes for this resident
  const cancelledPasses = await prisma.gatePass.updateMany({
    where: { residentId: resident.id, status: "ACTIVE" },
    data: { status: "CANCELLED" },
  });

  // Disable resident user login account
  if (resident.userId) {
    await prisma.user.update({
      where: { id: resident.userId },
      data: { isActive: false },
    });
  }

  await writeAudit({
    actor: req.user!,
    action: "RESIDENT_SUSPENDED",
    entityType: "Resident",
    entityId: resident.id,
    summary: `Access suspended for ${resident.firstName} ${resident.lastName}. Reason: ${reason || "Unpaid dues"}. ${cancelledPasses.count} active pass(es) revoked.`,
  });

  res.json({
    ok: true,
    message: `Gate access suspended for ${resident.firstName} ${resident.lastName}. ${cancelledPasses.count} active pass(es) revoked.`,
    resident: updated,
  });
}));

// Restore Resident Access (e.g. Dues Paid)
router.post("/:id/restore-access", authRequired(["SUPER_ADMIN", "ESTATE_MANAGEMENT"]), asyncH(async (req, res) => {
  const resident = await prisma.resident.findUnique({ where: { id: req.params.id } });
  if (!resident) throw new ApiError("Resident not found.", 404);

  const updated = await prisma.resident.update({
    where: { id: req.params.id },
    data: {
      propertyStatus: "ACTIVE",
      notes: `${resident.notes ? resident.notes + "\n" : ""}[RESTORED - ${new Date().toLocaleDateString()}]: Access restored by management.`,
    },
    include: { property: true, user: true },
  });

  // Re-enable resident user login account
  if (resident.userId) {
    await prisma.user.update({
      where: { id: resident.userId },
      data: { isActive: true },
    });
  }

  await writeAudit({
    actor: req.user!,
    action: "RESIDENT_RESTORED",
    entityType: "Resident",
    entityId: resident.id,
    summary: `Gate access restored for ${resident.firstName} ${resident.lastName}.`,
  });

  res.json({
    ok: true,
    message: `Gate access restored for ${resident.firstName} ${resident.lastName}.`,
    resident: updated,
  });
}));

// Delete / Remove Resident
router.delete("/:id", authRequired(["SUPER_ADMIN", "ESTATE_MANAGEMENT"]), asyncH(async (req, res) => {
  const resident = await prisma.resident.findUnique({
    where: { id: req.params.id },
    include: { user: true },
  });
  if (!resident) throw new ApiError("Resident not found.", 404);

  const residentName = `${resident.firstName} ${resident.lastName}`;

  // 1. Delete or cancel active gate passes
  await prisma.gatePass.deleteMany({
    where: { residentId: resident.id },
  });

  // 2. Unlink or clean access logs
  await prisma.accessLog.updateMany({
    where: { residentId: resident.id },
    data: { residentId: null },
  });

  // 3. Delete visitors associated
  await prisma.visitor.deleteMany({
    where: { residentId: resident.id },
  });

  // 4. Delete dispatch riders
  await prisma.dispatchRider.deleteMany({
    where: { residentId: resident.id },
  });

  // 5. Unlink vehicles
  await prisma.vehicle.updateMany({
    where: { residentId: resident.id },
    data: { residentId: null },
  });

  // 6. Delete the resident record
  await prisma.resident.delete({
    where: { id: req.params.id },
  });

  // 7. Delete user account if existed
  if (resident.userId) {
    await prisma.user.delete({
      where: { id: resident.userId },
    }).catch(() => {
      /* ignore if user was already deleted */
    });
  }

  await writeAudit({
    actor: req.user!,
    action: "RESIDENT_DELETED",
    entityType: "Resident",
    entityId: req.params.id,
    summary: `Removed resident: ${residentName}`,
  });

  res.json({ ok: true, message: `Resident ${residentName} successfully removed.` });
}));

export default router;
