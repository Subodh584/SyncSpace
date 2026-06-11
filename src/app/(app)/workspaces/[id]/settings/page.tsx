import { redirect } from "next/navigation";
import { getAuthorizedWorkspace } from "@/lib/auth-helpers";
import { WorkspaceSettingsForm } from "@/components/workspace/settings-form";

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workspace, membership } = await getAuthorizedWorkspace(id);
  if (membership.role !== "owner") redirect(`/workspaces/${id}`);

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">
        Workspace settings
      </h1>
      <WorkspaceSettingsForm
        workspaceId={id}
        name={workspace.name}
        description={workspace.description}
        assignmentStrategy={workspace.assignmentStrategy}
        joinCode={workspace.joinCode}
      />
    </div>
  );
}
