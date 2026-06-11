import { getAuthorizedWorkspace } from "@/lib/auth-helpers";
import { updateWorkspace, deleteWorkspace } from "@/actions/workspaces";
import { json, jsonError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const { workspace, membership } = await getAuthorizedWorkspace(id);
    return json({ workspace, role: membership.role });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json();
    const result = await updateWorkspace(id, body);
    if (!result.ok) return json({ error: result.error }, 400);
    return json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const result = await deleteWorkspace(id);
    if (!result.ok) return json({ error: result.error }, 400);
    return json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
