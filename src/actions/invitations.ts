"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  user,
  workspaceInvitations,
  workspaceMembers,
  workspaces,
} from "@/db/schema";
import { genId } from "@/lib/ids";
import { INVITATION_TTL_DAYS } from "@/lib/constants";
import {
  inviteByIdSchema,
  joinByCodeSchema,
  respondInvitationSchema,
} from "@/lib/validations";
import {
  requireUser,
  requireOwner,
  getMembership,
  AuthError,
} from "@/lib/auth-helpers";
import { logActivity, notify, notifyMany } from "@/lib/services/activity";
import { getMemberIds } from "@/lib/services/members";
import { type ActionResult, fail, ok } from "@/lib/action";

function inSevenDays(): Date {
  return new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export async function inviteByUserId(raw: unknown): Promise<ActionResult> {
  try {
    const input = inviteByIdSchema.parse(raw);
    const { user: owner } = await requireOwner(input.workspaceId);

    const target = await db
      .select()
      .from(user)
      .where(eq(user.workspaceUserId, input.workspaceUserId.trim()))
      .limit(1);
    if (!target[0]) throw new AuthError("No user found with that ID", 404);
    const invitee = target[0];

    const existingMember = await getMembership(input.workspaceId, invitee.id);
    if (existingMember) throw new AuthError("Already a member", 400);

    const pending = await db
      .select()
      .from(workspaceInvitations)
      .where(
        and(
          eq(workspaceInvitations.workspaceId, input.workspaceId),
          eq(workspaceInvitations.inviteeId, invitee.id),
          eq(workspaceInvitations.status, "pending"),
        ),
      )
      .limit(1);
    if (pending[0]) throw new AuthError("Invitation already pending", 400);

    const ws = await db
      .select({ name: workspaces.name })
      .from(workspaces)
      .where(eq(workspaces.id, input.workspaceId))
      .limit(1);

    await db.insert(workspaceInvitations).values({
      id: genId(),
      workspaceId: input.workspaceId,
      inviterId: owner.id,
      inviteeId: invitee.id,
      inviteeIdentifier: input.workspaceUserId.trim(),
      method: "user_id",
      status: "pending",
      expiresAt: inSevenDays(),
    });

    await notify({
      userId: invitee.id,
      workspaceId: input.workspaceId,
      type: "invitation",
      title: "New workspace invitation",
      body: `${owner.name} invited you to “${ws[0]?.name ?? "a workspace"}”`,
      link: "/invitations",
    });

    revalidatePath(`/workspaces/${input.workspaceId}/members`);
    return ok(null);
  } catch (err) {
    return fail(err);
  }
}

export async function joinByCode(raw: unknown): Promise<ActionResult<{ workspaceId: string }>> {
  try {
    const me = await requireUser();
    const input = joinByCodeSchema.parse(raw);

    const ws = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.joinCode, input.joinCode.trim().toUpperCase()))
      .limit(1);
    if (!ws[0]) throw new AuthError("Invalid join code", 404);

    const existing = await getMembership(ws[0].id, me.id);
    if (existing) return ok({ workspaceId: ws[0].id });

    await db.insert(workspaceMembers).values({
      id: genId(),
      workspaceId: ws[0].id,
      userId: me.id,
      role: "member",
    });
    await logActivity({
      workspaceId: ws[0].id,
      actorId: me.id,
      type: "member_joined",
      message: `${me.name} joined via join code`,
    });
    const others = await getMemberIds(ws[0].id);
    await notifyMany(
      others,
      {
        workspaceId: ws[0].id,
        type: "member_joined",
        title: "New member joined",
        body: `${me.name} joined the workspace`,
        link: `/workspaces/${ws[0].id}`,
      },
      me.id,
    );

    revalidatePath("/workspaces");
    return ok({ workspaceId: ws[0].id });
  } catch (err) {
    return fail(err);
  }
}

export async function respondToInvitation(
  raw: unknown,
): Promise<ActionResult> {
  try {
    const me = await requireUser();
    const input = respondInvitationSchema.parse(raw);

    const inv = await db
      .select()
      .from(workspaceInvitations)
      .where(eq(workspaceInvitations.id, input.invitationId))
      .limit(1);
    if (!inv[0]) throw new AuthError("Invitation not found", 404);
    if (inv[0].inviteeId !== me.id)
      throw new AuthError("This invitation is not addressed to you", 403);
    if (inv[0].status !== "pending")
      throw new AuthError("Invitation already handled", 400);

    const expired = inv[0].expiresAt.getTime() < Date.now();
    if (expired) {
      await db
        .update(workspaceInvitations)
        .set({ status: "expired", updatedAt: new Date() })
        .where(eq(workspaceInvitations.id, inv[0].id));
      throw new AuthError("Invitation has expired", 400);
    }

    if (input.action === "reject") {
      await db
        .update(workspaceInvitations)
        .set({ status: "rejected", updatedAt: new Date() })
        .where(eq(workspaceInvitations.id, inv[0].id));
      revalidatePath("/invitations");
      return ok(null);
    }

    // accept
    await db
      .update(workspaceInvitations)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(eq(workspaceInvitations.id, inv[0].id));

    const already = await getMembership(inv[0].workspaceId, me.id);
    if (!already) {
      await db.insert(workspaceMembers).values({
        id: genId(),
        workspaceId: inv[0].workspaceId,
        userId: me.id,
        role: "member",
      });
    }
    await logActivity({
      workspaceId: inv[0].workspaceId,
      actorId: me.id,
      type: "member_joined",
      message: `${me.name} joined the workspace`,
    });
    const others = await getMemberIds(inv[0].workspaceId);
    await notifyMany(
      others,
      {
        workspaceId: inv[0].workspaceId,
        type: "member_joined",
        title: "New member joined",
        body: `${me.name} accepted the invitation`,
        link: `/workspaces/${inv[0].workspaceId}`,
      },
      me.id,
    );

    revalidatePath("/invitations");
    revalidatePath("/workspaces");
    return ok(null);
  } catch (err) {
    return fail(err);
  }
}
