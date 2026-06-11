"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { workspaceMembers, workspaces } from "@/db/schema";
import { genId, genJoinCode } from "@/lib/ids";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
} from "@/lib/validations";
import {
  requireUser,
  requireOwner,
  requireMember,
  AuthError,
} from "@/lib/auth-helpers";
import { logActivity, notifyMany } from "@/lib/services/activity";
import { getMemberIds } from "@/lib/services/members";
import { type ActionResult, fail } from "@/lib/action";

export async function createWorkspace(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const input = createWorkspaceSchema.parse(raw);
    const id = genId();
    await db.insert(workspaces).values({
      id,
      name: input.name,
      description: input.description,
      ownerId: user.id,
      joinCode: genJoinCode(),
      assignmentStrategy: input.assignmentStrategy,
      currency: input.currency,
    });
    await db.insert(workspaceMembers).values({
      id: genId(),
      workspaceId: id,
      userId: user.id,
      role: "owner",
    });
    await logActivity({
      workspaceId: id,
      actorId: user.id,
      type: "member_joined",
      message: `${user.name} created the workspace`,
    });
    revalidatePath("/workspaces");
    return { ok: true, data: { id } };
  } catch (err) {
    return fail(err);
  }
}

export async function updateWorkspace(
  workspaceId: string,
  raw: unknown,
): Promise<ActionResult> {
  try {
    await requireOwner(workspaceId);
    const input = updateWorkspaceSchema.parse(raw);
    await db
      .update(workspaces)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(workspaces.id, workspaceId));
    revalidatePath(`/workspaces/${workspaceId}/settings`);
    return { ok: true, data: null };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteWorkspace(
  workspaceId: string,
): Promise<ActionResult> {
  try {
    await requireOwner(workspaceId);
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    revalidatePath("/workspaces");
    return { ok: true, data: null };
  } catch (err) {
    return fail(err);
  }
}

export async function transferOwnership(
  workspaceId: string,
  newOwnerId: string,
): Promise<ActionResult> {
  try {
    const { user } = await requireOwner(workspaceId);
    const target = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, newOwnerId),
        ),
      )
      .limit(1);
    if (!target[0]) throw new AuthError("New owner must be a member", 400);

    await db
      .update(workspaces)
      .set({ ownerId: newOwnerId, updatedAt: new Date() })
      .where(eq(workspaces.id, workspaceId));
    await db
      .update(workspaceMembers)
      .set({ role: "member" })
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, user.id),
        ),
      );
    await db
      .update(workspaceMembers)
      .set({ role: "owner" })
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, newOwnerId),
        ),
      );
    revalidatePath(`/workspaces/${workspaceId}/settings`);
    return { ok: true, data: null };
  } catch (err) {
    return fail(err);
  }
}

export async function removeMember(
  workspaceId: string,
  targetUserId: string,
): Promise<ActionResult> {
  try {
    const { user } = await requireOwner(workspaceId);
    if (targetUserId === user.id)
      throw new AuthError("Owner cannot remove themselves", 400);
    await db
      .delete(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, targetUserId),
        ),
      );
    revalidatePath(`/workspaces/${workspaceId}/members`);
    return { ok: true, data: null };
  } catch (err) {
    return fail(err);
  }
}

export async function leaveWorkspace(
  workspaceId: string,
): Promise<ActionResult> {
  try {
    const { user, membership } = await requireMember(workspaceId);
    if (membership.role === "owner")
      throw new AuthError(
        "Transfer ownership before leaving the workspace",
        400,
      );
    await db
      .delete(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, user.id),
        ),
      );
    const remaining = await getMemberIds(workspaceId);
    await notifyMany(remaining, {
      workspaceId,
      type: "member_joined",
      title: "A member left",
      body: `${user.name} left the workspace`,
    });
    revalidatePath("/workspaces");
    return { ok: true, data: null };
  } catch (err) {
    return fail(err);
  }
}

export async function regenerateJoinCode(
  workspaceId: string,
): Promise<ActionResult<{ joinCode: string }>> {
  try {
    await requireOwner(workspaceId);
    const joinCode = genJoinCode();
    await db
      .update(workspaces)
      .set({ joinCode, updatedAt: new Date() })
      .where(eq(workspaces.id, workspaceId));
    revalidatePath(`/workspaces/${workspaceId}/settings`);
    return { ok: true, data: { joinCode } };
  } catch (err) {
    return fail(err);
  }
}
