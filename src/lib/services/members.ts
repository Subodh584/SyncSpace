import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workspaceMembers, user } from "@/db/schema";

export interface MemberWithUser {
  userId: string;
  role: "owner" | "member";
  name: string;
  username: string;
  email: string;
  image: string | null;
  workspaceUserId: string;
}

/** All members of a workspace joined with their user profile. */
export async function getWorkspaceMembers(
  workspaceId: string,
): Promise<MemberWithUser[]> {
  const rows = await db
    .select({
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      name: user.name,
      username: user.username,
      email: user.email,
      image: user.image,
      workspaceUserId: user.workspaceUserId,
    })
    .from(workspaceMembers)
    .innerJoin(user, eq(workspaceMembers.userId, user.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId));
  return rows;
}

export async function getMemberIds(workspaceId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId));
  return rows.map((r) => r.userId);
}
