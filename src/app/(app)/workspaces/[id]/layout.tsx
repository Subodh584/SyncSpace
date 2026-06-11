import { notFound, redirect } from "next/navigation";
import { AuthError, getAuthorizedWorkspace } from "@/lib/auth-helpers";
import {
  WorkspaceSidebar,
  WorkspaceMobileNav,
} from "@/components/workspace/sidebar";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let workspace;
  let membership;
  try {
    const res = await getAuthorizedWorkspace(id);
    workspace = res.workspace;
    membership = res.membership;
  } catch (err) {
    if (err instanceof AuthError) {
      if (err.status === 404) notFound();
      redirect("/workspaces");
    }
    throw err;
  }

  const isOwner = membership.role === "owner";

  return (
    <div className="flex">
      <WorkspaceSidebar
        workspaceId={id}
        workspaceName={workspace.name}
        isOwner={isOwner}
      />
      <div className="min-w-0 flex-1">
        <WorkspaceMobileNav workspaceId={id} isOwner={isOwner} />
        {children}
      </div>
    </div>
  );
}
