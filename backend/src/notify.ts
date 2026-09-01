import { prisma } from "./db";
import { Prisma, NotificationType, Role } from "@prisma/client";

type NotifyTarget = { userId?: string | null; role?: Role };

export async function notify(
  targets: NotifyTarget[],
  input: {
    type: NotificationType;
    title: string;
    message: string;
    actorName?: string;
    link?: string;
  }
) {
  const conditions: Prisma.UserWhereInput[] = [];
  for (const t of targets) {
    if (t.userId) conditions.push({ id: t.userId });
    if (t.role) conditions.push({ role: t.role });
  }
  if (conditions.length === 0) return;

  const recipients = await prisma.user.findMany({ where: { OR: conditions }, select: { id: true } });
  const rows = recipients.map((r) => ({
    userId: r.id,
    type: input.type,
    title: input.title,
    message: input.message,
    actorName: input.actorName,
    link: input.link,
  }));
  try {
    if (rows.length) await prisma.notification.createMany({ data: rows });
  } catch (err) {
    console.error("notify failed", err);
  }
}
