"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { taskRotations } from "@/db/schema";
import { genId } from "@/lib/ids";
import { createRotationSchema } from "@/lib/validations";
import { requireMember, AuthError } from "@/lib/auth-helpers";
import { logActivity, notify } from "@/lib/services/activity";
import {
  nextAssignee,
  upcomingAssignee,
  addInterval,
} from "@/lib/algorithms/rotation";
import { type ActionResult, fail, ok } from "@/lib/action";

export async function createRotation(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const input = createRotationSchema.parse(raw);
    const { user: me } = await requireMember(input.workspaceId);

    const order = input.memberOrder;
    const current = order[0] ?? null;
    const next = upcomingAssignee(order, null); // member after current
    const id = genId();
    await db.insert(taskRotations).values({
      id,
      workspaceId: input.workspaceId,
      title: input.title,
      description: input.description,
      frequency: input.frequency,
      memberOrder: order,
      currentAssigneeId: current,
      nextAssigneeId: next,
      history: current
        ? [{ userId: current, rotatedAt: Math.floor(Date.now() / 1000) }]
        : [],
      lastRotatedAt: new Date(),
      nextRotationAt: addInterval(new Date(), input.frequency),
    });

    await logActivity({
      workspaceId: input.workspaceId,
      actorId: me.id,
      type: "rotation_changed",
      message: `${me.name} created rotation “${input.title}”`,
      metadata: { rotationId: id },
    });
    if (current && current !== me.id) {
      await notify({
        userId: current,
        workspaceId: input.workspaceId,
        type: "rotation_changed",
        title: "You're up in a rotation",
        body: `You are the current assignee for “${input.title}”`,
        link: `/workspaces/${input.workspaceId}/rotations`,
      });
    }
    revalidatePath(`/workspaces/${input.workspaceId}/rotations`);
    return ok({ id });
  } catch (err) {
    return fail(err);
  }
}

/** Advance a rotation to the next member (manual or scheduled). */
export async function advanceRotation(
  rotationId: string,
): Promise<ActionResult> {
  try {
    const existing = await db
      .select()
      .from(taskRotations)
      .where(eq(taskRotations.id, rotationId))
      .limit(1);
    if (!existing[0]) throw new AuthError("Rotation not found", 404);
    const r = existing[0];
    const { user: me } = await requireMember(r.workspaceId);

    const order = r.memberOrder ?? [];
    const newCurrent = nextAssignee(order, r.currentAssigneeId);
    const newNext = upcomingAssignee(order, r.currentAssigneeId);
    const history = [
      ...(r.history ?? []),
      ...(newCurrent
        ? [{ userId: newCurrent, rotatedAt: Math.floor(Date.now() / 1000) }]
        : []),
    ];

    await db
      .update(taskRotations)
      .set({
        currentAssigneeId: newCurrent,
        nextAssigneeId: newNext,
        history,
        lastRotatedAt: new Date(),
        nextRotationAt: addInterval(new Date(), r.frequency),
        updatedAt: new Date(),
      })
      .where(eq(taskRotations.id, r.id));

    await logActivity({
      workspaceId: r.workspaceId,
      actorId: me.id,
      type: "rotation_changed",
      message: `Rotation “${r.title}” advanced`,
      metadata: { rotationId: r.id },
    });
    if (newCurrent && newCurrent !== me.id) {
      await notify({
        userId: newCurrent,
        workspaceId: r.workspaceId,
        type: "rotation_changed",
        title: "Your turn in a rotation",
        body: `You are now responsible for “${r.title}”`,
        link: `/workspaces/${r.workspaceId}/rotations`,
      });
    }
    revalidatePath(`/workspaces/${r.workspaceId}/rotations`);
    return ok(null);
  } catch (err) {
    return fail(err);
  }
}

export async function deleteRotation(
  rotationId: string,
): Promise<ActionResult> {
  try {
    const existing = await db
      .select({ workspaceId: taskRotations.workspaceId })
      .from(taskRotations)
      .where(eq(taskRotations.id, rotationId))
      .limit(1);
    if (!existing[0]) throw new AuthError("Rotation not found", 404);
    await requireMember(existing[0].workspaceId);
    await db.delete(taskRotations).where(eq(taskRotations.id, rotationId));
    revalidatePath(`/workspaces/${existing[0].workspaceId}/rotations`);
    return ok(null);
  } catch (err) {
    return fail(err);
  }
}
