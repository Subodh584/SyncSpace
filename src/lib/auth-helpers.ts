import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workspaceMembers, workspaces } from "@/db/schema";

export class AuthError extends Error {
  constructor(
    message: string,
    public status = 401,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/** Returns the session or null. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Returns the logged-in user or throws AuthError(401). */
export async function requireUser() {
  const session = await getSession();
  if (!session?.user) throw new AuthError("Not authenticated", 401);
  return session.user;
}

/** Membership row (role) for a user in a workspace, or null. */
export async function getMembership(workspaceId: string, userId: string) {
  const rows = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Throws unless the current user is a member of the workspace. */
export async function requireMember(workspaceId: string) {
  const user = await requireUser();
  const membership = await getMembership(workspaceId, user.id);
  if (!membership)
    throw new AuthError("Not a member of this workspace", 403);
  return { user, membership };
}

/** Throws unless the current user is the workspace owner. */
export async function requireOwner(workspaceId: string) {
  const { user, membership } = await requireMember(workspaceId);
  if (membership.role !== "owner")
    throw new AuthError("Owner permission required", 403);
  return { user, membership };
}

/** Fetch a workspace the user belongs to, or throw. */
export async function getAuthorizedWorkspace(workspaceId: string) {
  const { user, membership } = await requireMember(workspaceId);
  const rows = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  if (!rows[0]) throw new AuthError("Workspace not found", 404);
  return { user, membership, workspace: rows[0] };
}
