import { and, desc, eq } from "drizzle-orm";
import { Mail } from "lucide-react";
import { db } from "@/db";
import { workspaceInvitations, workspaces, user as userTable } from "@/db/schema";
import { getCurrentUser } from "@/lib/current-user";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { InvitationActions } from "@/components/invitations/invitation-actions";
import { relativeTime } from "@/lib/utils";

export default async function InvitationsPage() {
  const me = await getCurrentUser();

  const invites = await db
    .select({
      id: workspaceInvitations.id,
      createdAt: workspaceInvitations.createdAt,
      expiresAt: workspaceInvitations.expiresAt,
      workspaceName: workspaces.name,
      workspaceDescription: workspaces.description,
      inviterName: userTable.name,
    })
    .from(workspaceInvitations)
    .innerJoin(workspaces, eq(workspaceInvitations.workspaceId, workspaces.id))
    .innerJoin(userTable, eq(workspaceInvitations.inviterId, userTable.id))
    .where(
      and(
        eq(workspaceInvitations.inviteeId, me.id),
        eq(workspaceInvitations.status, "pending"),
      ),
    )
    .orderBy(desc(workspaceInvitations.createdAt));

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Invitations</h1>

      {invites.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No pending invitations"
          description="When someone invites you to a workspace it will appear here."
        />
      ) : (
        <div className="space-y-3">
          {invites.map((inv) => (
            <Card key={inv.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{inv.workspaceName}</p>
                  <p className="text-sm text-muted-foreground">
                    Invited by {inv.inviterName} · {relativeTime(inv.createdAt)}
                  </p>
                </div>
                <InvitationActions invitationId={inv.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
