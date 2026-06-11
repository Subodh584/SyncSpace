import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { requireMember } from "@/lib/auth-helpers";
import { createTask } from "@/actions/tasks";
import { json, jsonError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    await requireMember(id);
    const rows = await db
      .select()
      .from(tasks)
      .where(eq(tasks.workspaceId, id))
      .orderBy(desc(tasks.createdAt));
    return json({ tasks: rows });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json();
    const result = await createTask({ ...body, workspaceId: id });
    if (!result.ok) return json({ error: result.error }, 400);
    return json(result.data, 201);
  } catch (err) {
    return jsonError(err);
  }
}
