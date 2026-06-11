import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import { json, jsonError } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const me = await requireUser();
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get("unread") === "true";
    const rows = await db
      .select()
      .from(notifications)
      .where(
        unreadOnly
          ? and(
              eq(notifications.userId, me.id),
              eq(notifications.read, false),
            )
          : eq(notifications.userId, me.id),
      )
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    const unreadCount = rows.filter((n) => !n.read).length;
    return json({ notifications: rows, unreadCount });
  } catch (err) {
    return jsonError(err);
  }
}
