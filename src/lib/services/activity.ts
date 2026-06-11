import { inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  activityLogs,
  notifications,
  type ActivityLog,
  type Notification,
} from "@/db/schema";
import { genId } from "@/lib/ids";

type ActivityType = ActivityLog["type"];
type NotificationType = Notification["type"];

export async function logActivity(input: {
  workspaceId: string;
  actorId?: string | null;
  type: ActivityType;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(activityLogs).values({
    id: genId(),
    workspaceId: input.workspaceId,
    actorId: input.actorId ?? null,
    type: input.type,
    message: input.message,
    metadata: input.metadata,
  });
}

export async function notify(input: {
  userId: string;
  workspaceId?: string | null;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}) {
  await db.insert(notifications).values({
    id: genId(),
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
  });
}

/** Fan out one notification to many users (skips the actor). */
export async function notifyMany(
  userIds: string[],
  input: Omit<Parameters<typeof notify>[0], "userId">,
  exclude?: string,
) {
  const targets = userIds.filter((id) => id !== exclude);
  if (targets.length === 0) return;
  await db.insert(notifications).values(
    targets.map((userId) => ({
      id: genId(),
      userId,
      workspaceId: input.workspaceId ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
    })),
  );
}

/** Helper used by fan-out callers to avoid N queries elsewhere. */
export function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

export { inArray };
