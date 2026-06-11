import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workspaceMembers, workspaces } from "@/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import { createWorkspace } from "@/actions/workspaces";
import { json, jsonError } from "@/lib/api";
import { rateLimit, clientKey } from "@/lib/rate-limit";

// GET /api/workspaces — workspaces the current user belongs to
export async function GET() {
  try {
    const me = await requireUser();
    const rows = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        description: workspaces.description,
        ownerId: workspaces.ownerId,
        joinCode: workspaces.joinCode,
        role: workspaceMembers.role,
        createdAt: workspaces.createdAt,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, me.id));
    return json({ workspaces: rows });
  } catch (err) {
    return jsonError(err);
  }
}

// POST /api/workspaces — create a workspace
export async function POST(req: Request) {
  try {
    const rl = rateLimit(clientKey(req, "create-workspace"), 10, 60_000);
    if (!rl.success) return json({ error: "Too many requests" }, 429);
    const body = await req.json();
    const result = await createWorkspace(body);
    if (!result.ok) return json({ error: result.error }, 400);
    return json(result.data, 201);
  } catch (err) {
    return jsonError(err);
  }
}
