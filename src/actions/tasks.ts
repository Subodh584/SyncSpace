"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { tasks, user } from "@/db/schema";
import { genId } from "@/lib/ids";
import {
  createTaskSchema,
  updateTaskSchema,
  moveTaskSchema,
  autoAssignSchema,
} from "@/lib/validations";
import {
  requireMember,
  getMembership,
  AuthError,
} from "@/lib/auth-helpers";
import { logActivity, notify } from "@/lib/services/activity";
import { getWorkspaceMembers } from "@/lib/services/members";
import { assignTasks, type MemberLoad } from "@/lib/algorithms/assignment";
import { type ActionResult, fail, ok } from "@/lib/action";

async function userName(id: string | null | undefined): Promise<string> {
  if (!id) return "Unassigned";
  const r = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);
  return r[0]?.name ?? "Someone";
}

export async function createTask(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const input = createTaskSchema.parse(raw);
    const { user: me } = await requireMember(input.workspaceId);

    if (input.assignedTo) {
      const m = await getMembership(input.workspaceId, input.assignedTo);
      if (!m) throw new AuthError("Assignee is not a member", 400);
    }

    const id = genId();
    await db.insert(tasks).values({
      id,
      title: input.title,
      description: input.description,
      difficultyWeight: input.difficultyWeight,
      priority: input.priority,
      status: input.status,
      dueDate: input.dueDate,
      workspaceId: input.workspaceId,
      createdBy: me.id,
      assignedTo: input.assignedTo || null,
    });

    await logActivity({
      workspaceId: input.workspaceId,
      actorId: me.id,
      type: "task_created",
      message: `${me.name} created task “${input.title}”`,
      metadata: { taskId: id },
    });

    if (input.assignedTo && input.assignedTo !== me.id) {
      await notify({
        userId: input.assignedTo,
        workspaceId: input.workspaceId,
        type: "task_assigned",
        title: "New task assigned",
        body: `“${input.title}” was assigned to you`,
        link: `/workspaces/${input.workspaceId}/tasks`,
      });
    }

    revalidatePath(`/workspaces/${input.workspaceId}/tasks`);
    return ok({ id });
  } catch (err) {
    return fail(err);
  }
}

export async function updateTask(raw: unknown): Promise<ActionResult> {
  try {
    const input = updateTaskSchema.parse(raw);
    const existing = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, input.id))
      .limit(1);
    if (!existing[0]) throw new AuthError("Task not found", 404);
    const task = existing[0];
    const { user: me } = await requireMember(task.workspaceId);

    const prevAssignee = task.assignedTo;
    const completing =
      input.status === "completed" && task.status !== "completed";

    await db
      .update(tasks)
      .set({
        title: input.title ?? task.title,
        description: input.description ?? task.description,
        difficultyWeight: input.difficultyWeight ?? task.difficultyWeight,
        priority: input.priority ?? task.priority,
        status: input.status ?? task.status,
        dueDate: input.dueDate ?? task.dueDate,
        assignedTo:
          input.assignedTo === undefined
            ? task.assignedTo
            : input.assignedTo || null,
        completedAt: completing ? new Date() : task.completedAt,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, task.id));

    if (completing) {
      await logActivity({
        workspaceId: task.workspaceId,
        actorId: me.id,
        type: "task_completed",
        message: `${me.name} completed “${task.title}”`,
        metadata: { taskId: task.id },
      });
    }

    if (input.assignedTo && input.assignedTo !== prevAssignee) {
      await logActivity({
        workspaceId: task.workspaceId,
        actorId: me.id,
        type: "task_assigned",
        message: `“${task.title}” reassigned to ${await userName(input.assignedTo)}`,
        metadata: { taskId: task.id },
      });
      if (input.assignedTo !== me.id) {
        await notify({
          userId: input.assignedTo,
          workspaceId: task.workspaceId,
          type: "task_assigned",
          title: "Task assigned to you",
          body: `“${task.title}” was assigned to you`,
          link: `/workspaces/${task.workspaceId}/tasks`,
        });
      }
    }

    revalidatePath(`/workspaces/${task.workspaceId}/tasks`);
    return ok(null);
  } catch (err) {
    return fail(err);
  }
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  try {
    const existing = await db
      .select({ workspaceId: tasks.workspaceId })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    if (!existing[0]) throw new AuthError("Task not found", 404);
    await requireMember(existing[0].workspaceId);
    await db.delete(tasks).where(eq(tasks.id, taskId));
    revalidatePath(`/workspaces/${existing[0].workspaceId}/tasks`);
    return ok(null);
  } catch (err) {
    return fail(err);
  }
}

/** Used by the drag-and-drop board to persist a status/position change. */
export async function moveTask(raw: unknown): Promise<ActionResult> {
  try {
    const input = moveTaskSchema.parse(raw);
    const existing = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, input.id))
      .limit(1);
    if (!existing[0]) throw new AuthError("Task not found", 404);
    const task = existing[0];
    const { user: me } = await requireMember(task.workspaceId);

    const completing =
      input.status === "completed" && task.status !== "completed";
    await db
      .update(tasks)
      .set({
        status: input.status,
        position: input.position,
        completedAt: completing ? new Date() : task.completedAt,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, task.id));

    if (completing) {
      await logActivity({
        workspaceId: task.workspaceId,
        actorId: me.id,
        type: "task_completed",
        message: `${me.name} completed “${task.title}”`,
        metadata: { taskId: task.id },
      });
    }
    revalidatePath(`/workspaces/${task.workspaceId}/tasks`);
    return ok(null);
  } catch (err) {
    return fail(err);
  }
}

/** Run an assignment algorithm across the workspace's tasks. */
export async function autoAssign(
  raw: unknown,
): Promise<ActionResult<{ assigned: number }>> {
  try {
    const input = autoAssignSchema.parse(raw);
    const { user: me } = await requireMember(input.workspaceId);

    const members = await getWorkspaceMembers(input.workspaceId);
    if (members.length === 0) throw new AuthError("No members to assign", 400);

    const allTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.workspaceId, input.workspaceId),
          input.onlyUnassigned
            ? sql`${tasks.assignedTo} IS NULL`
            : sql`1 = 1`,
        ),
      );
    const target = allTasks.filter((t) => t.status !== "completed");
    if (target.length === 0) return ok({ assigned: 0 });

    // Build current load from existing assignments (so equal/weighted balance).
    const loadMap = new Map<string, MemberLoad>(
      members.map((m) => [
        m.userId,
        { userId: m.userId, taskCount: 0, weightLoad: 0 },
      ]),
    );
    for (const t of allTasks) {
      if (t.assignedTo && loadMap.has(t.assignedTo)) {
        const l = loadMap.get(t.assignedTo)!;
        l.taskCount += 1;
        l.weightLoad += t.difficultyWeight;
      }
    }

    const assignment = assignTasks(
      input.strategy,
      target.map((t) => ({ id: t.id, difficultyWeight: t.difficultyWeight })),
      Array.from(loadMap.values()),
    );

    const entries = Object.entries(assignment);
    await Promise.all(
      entries.map(([taskId, userId]) =>
        db
          .update(tasks)
          .set({ assignedTo: userId, updatedAt: new Date() })
          .where(eq(tasks.id, taskId)),
      ),
    );

    await logActivity({
      workspaceId: input.workspaceId,
      actorId: me.id,
      type: "task_assigned",
      message: `${me.name} auto-assigned ${entries.length} task(s)`,
    });

    // Notify each assignee once.
    const byUser = new Map<string, number>();
    for (const [, uid] of entries)
      byUser.set(uid, (byUser.get(uid) ?? 0) + 1);
    await Promise.all(
      Array.from(byUser.entries())
        .filter(([uid]) => uid !== me.id)
        .map(([uid, count]) =>
          notify({
            userId: uid,
            workspaceId: input.workspaceId,
            type: "task_assigned",
            title: "Tasks assigned to you",
            body: `${count} task(s) were assigned to you`,
            link: `/workspaces/${input.workspaceId}/tasks`,
          }),
        ),
    );

    revalidatePath(`/workspaces/${input.workspaceId}/tasks`);
    return ok({ assigned: entries.length });
  } catch (err) {
    return fail(err);
  }
}
