import { prisma } from "./db";
import { SessionUser } from "./auth";

type AuditInput = {
  actor: SessionUser | null;
  action: string;
  entityType?: string;
  entityId?: string;
  summary?: string;
  ip?: string | null;
  userAgent?: string | null;
};

export async function writeAudit(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: input.actor?.sub ?? null,
        actorName: input.actor?.name ?? "System",
        actorRole: input.actor?.role ?? "SYSTEM",
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        summary: input.summary,
        ipAddress: input.ip,
        userAgent: input.userAgent,
      },
    });
  } catch (err) {
    console.error("audit log failed", err);
  }
}

export function describeAudit(source: {
  actorName?: string;
  action: string;
  person?: string;
  resident?: string;
  status?: string;
}) {
  const parts = [source.actorName ?? "System"];
  if (source.person) parts.push(source.person);
  if (source.resident) parts.push(`→ ${source.resident}`);
  if (source.status) parts.push(`${source.status}`);
  parts.push(source.action);
  return parts.join(" · ");
}
