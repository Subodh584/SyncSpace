"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUser, AuthError } from "@/lib/auth-helpers";
import { type ActionResult, fail, ok } from "@/lib/action";

export async function markNotificationRead(
  notificationId: string,
): Promise<ActionResult> {
  try {
    const me = await requireUser();
    const row = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, notificationId))
      .limit(1);
    if (!row[0] || row[0].userId !== me.id)
      throw new AuthError("Notification not found", 404);
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, notificationId));
    revalidatePath("/notifications");
    return ok(null);
  } catch (err) {
    return fail(err);
  }
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  try {
    const me = await requireUser();
    await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.userId, me.id),
          eq(notifications.read, false),
        ),
      );
    revalidatePath("/notifications");
    return ok(null);
  } catch (err) {
    return fail(err);
  }
}
