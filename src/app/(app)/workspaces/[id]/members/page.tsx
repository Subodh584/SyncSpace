import { and, desc, eq } from "drizzle-orm";
import { Crown } from "lucide-react";
import { db } from "@/db";
import { workspaceInvitations, user as userTable } from "@/db/schema";
import { getAuthorizedWorkspace } from "@/lib/auth-helpers";
import { getCurrentUser } from "@/lib/current-user";
import { getWorkspaceMembers } from "@/lib/services/members";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InviteMember } from "@/components/members/invite-member";
import { MemberActions } from "@/components/members/member-actions";
import { initials } from "@/lib/utils";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workspace, membership } = await getAuthorizedWorkspace(id);
  const me = await getCurrentUser();
  const isOwner = membership.role === "owner";

  const members = await getWorkspaceMembers(id);
  const pendingInvites = isOwner
    ? await db
        .select({
          id: workspaceInvitations.id,
          identifier: workspaceInvitations.inviteeIdentifier,
          inviteeName: userTable.name,
          createdAt: workspaceInvitations.createdAt,
        })
        .from(workspaceInvitations)
        .leftJoin(
          userTable,
          eq(workspaceInvitations.inviteeId, userTable.id),
        )
        .where(
          and(
            eq(workspaceInvitations.workspaceId, id),
            eq(workspaceInvitations.status, "pending"),
          ),
        )
        .orderBy(desc(workspaceInvitations.createdAt))
    : [];

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Members</h1>
        {isOwner && (
          <InviteMember workspaceId={id} joinCode={workspace.joinCode} />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{members.length} members</CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center gap-3 p-4">
              <Avatar>
                {m.image && <AvatarImage src={m.image} />}
                <AvatarFallback>{initials(m.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {m.name}
                  {m.userId === me.id && (
                    <span className="text-muted-foreground"> (you)</span>
                  )}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {m.workspaceUserId}
                </p>
              </div>
              {m.role === "owner" ? (
                <Badge variant="secondary" className="gap-1">
                  <Crown className="h-3 w-3" /> Owner
                </Badge>
              ) : (
                <Badge variant="outline">Member</Badge>
              )}
              {isOwner && m.userId !== me.id && (
                <MemberActions
                  workspaceId={id}
                  targetUserId={m.userId}
                  targetName={m.name}
                />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {isOwner && pendingInvites.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {inv.inviteeName ?? inv.identifier}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {inv.identifier}
                  </p>
                </div>
                <Badge variant="warning">Pending</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
