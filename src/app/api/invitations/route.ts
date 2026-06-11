import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { workspaceInvitations, workspaces, user } from "@/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import { inviteByUserId } from "@/actions/invitations";
import { json, jsonError } from "@/lib/api";

// GET — pending invitations addressed to the current user
export async function GET() {
  try {
    const me = await requireUser();
    const rows = await db
      .select({
        id: workspaceInvitations.id,
        status: workspaceInvitations.status,
        expiresAt: workspaceInvitations.expiresAt,
        createdAt: workspaceInvitations.createdAt,
        workspaceId: workspaceInvitations.workspaceId,
        workspaceName: workspaces.name,
        inviterName: user.name,
      })
      .from(workspaceInvitations)
      .innerJoin(
        workspaces,
        eq(workspaceInvitations.workspaceId, workspaces.id),
      )
      .innerJoin(user, eq(workspaceInvitations.inviterId, user.id))
      .where(
        and(
          eq(workspaceInvitations.inviteeId, me.id),
          eq(workspaceInvitations.status, "pending"),
        ),
      )
      .orderBy(desc(workspaceInvitations.createdAt));
    return json({ invitations: rows });
  } catch (err) {
    return jsonError(err);
  }
}

// POST — send an invitation by workspace user ID
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await inviteByUserId(body);
    if (!result.ok) return json({ error: result.error }, 400);
    return json({ ok: true }, 201);
  } catch (err) {
    return jsonError(err);
  }
}
