import { eq } from "drizzle-orm";
import { db } from "@/db";
import { taskRotations } from "@/db/schema";
import { logActivity, notify } from "@/lib/services/activity";
import { nextAssignee, addInterval } from "@/lib/algorithms/rotation";

/**
 * Auto-advance every active rotation in a workspace whose scheduled time has
 * passed, so a rotation moves to the next person on its own once a new day
 * (or week/month) begins — no manual "Advance" needed.
 *
 * This runs lazily whenever the rotations page is viewed (there is no external
 * scheduler). It catches up multiple missed periods at once — e.g. if nobody
 * opened the app for three days, a daily rotation jumps three people forward —
 * by counting how many intervals elapsed and stepping the assignee that many
 * times, then writing a single update so it stays aligned to the schedule.
 *
 * Returns the number of rotations advanced.
 */
export async function autoAdvanceDueRotations(
  workspaceId: string,
): Promise<number> {
  const rows = await db
    .select()
    .from(taskRotations)
    .where(eq(taskRotations.workspaceId, workspaceId));

  const now = new Date();
  let advanced = 0;

  for (const r of rows) {
    if (!r.active || r.memberOrder.length === 0 || !r.nextRotationAt) continue;

    // How many full periods have elapsed since the rotation was last due.
    let steps = 0;
    let nextRotationAt = r.nextRotationAt;
    while (nextRotationAt.getTime() <= now.getTime() && steps < 1000) {
      nextRotationAt = addInterval(nextRotationAt, r.frequency);
      steps++;
    }
    if (steps === 0) continue;

    // Step the assignee forward `steps` times through the order.
    const order = r.memberOrder;
    let current = r.currentAssigneeId;
    const history = [...(r.history ?? [])];
    for (let i = 0; i < steps; i++) {
      current = nextAssignee(order, current);
      if (current) {
        history.push({ userId: current, rotatedAt: Math.floor(now.getTime() / 1000) });
      }
    }
    const newNext = nextAssignee(order, current);

    await db
      .update(taskRotations)
      .set({
        currentAssigneeId: current,
        nextAssigneeId: newNext,
        history,
        lastRotatedAt: now,
        nextRotationAt,
        updatedAt: now,
      })
      .where(eq(taskRotations.id, r.id));

    await logActivity({
      workspaceId,
      actorId: null, // system-driven
      type: "rotation_changed",
      message: `Rotation “${r.title}” auto-advanced`,
      metadata: { rotationId: r.id },
    });
    if (current) {
      await notify({
        userId: current,
        workspaceId,
        type: "rotation_changed",
        title: "Your turn in a rotation",
        body: `You are now responsible for “${r.title}”`,
        link: `/workspaces/${workspaceId}/rotations`,
      });
    }
    advanced++;
  }

  return advanced;
}
