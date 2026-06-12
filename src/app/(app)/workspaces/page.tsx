import { eq, sql } from "drizzle-orm";
import { Layers } from "lucide-react";
import { db } from "@/db";
import { workspaceMembers, workspaces } from "@/db/schema";
import { getCurrentUser } from "@/lib/current-user";
import { EmptyState } from "@/components/empty-state";
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";
import { WorkspaceCard } from "@/components/workspace/workspace-card";

export default async function WorkspacesPage() {
  const user = await getCurrentUser();

  const myWorkspaces = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      description: workspaces.description,
      ownerId: workspaces.ownerId,
      role: workspaceMembers.role,
      memberCount: sql<number>`(
        SELECT COUNT(*) FROM ${workspaceMembers} wm
        WHERE wm.workspace_id = ${workspaces.id}
      )`,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, user.id));

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your workspaces</h1>
          <p className="text-sm text-muted-foreground">
            Your workspace ID is{" "}
            <span className="font-mono font-medium text-foreground">
              {user.workspaceUserId}
            </span>{" "}
            — share it to receive invites.
          </p>
        </div>
        <CreateWorkspaceDialog />
      </div>

      {myWorkspaces.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No workspaces yet"
          description="Create your first workspace for your flat, hostel, family or project team — or join one with a code."
          action={<CreateWorkspaceDialog />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myWorkspaces.map((w) => (
            <WorkspaceCard key={w.id} workspace={w} />
          ))}
        </div>
      )}
    </div>
  );
}
