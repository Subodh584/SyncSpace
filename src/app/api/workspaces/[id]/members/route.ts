import { requireMember } from "@/lib/auth-helpers";
import { getWorkspaceMembers } from "@/lib/services/members";
import { json, jsonError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    await requireMember(id);
    const members = await getWorkspaceMembers(id);
    return json({ members });
  } catch (err) {
    return jsonError(err);
  }
}
