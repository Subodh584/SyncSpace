import { requireMember } from "@/lib/auth-helpers";
import { listExpenses } from "@/lib/services/expenses";
import { createExpense } from "@/actions/expenses";
import { json, jsonError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    await requireMember(id);
    const expenses = await listExpenses(id);
    return json({ expenses });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json();
    const result = await createExpense({ ...body, workspaceId: id });
    if (!result.ok) return json({ error: result.error }, 400);
    return json(result.data, 201);
  } catch (err) {
    return jsonError(err);
  }
}
