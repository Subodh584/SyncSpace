import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settlements } from "@/db/schema";
import { requireMember } from "@/lib/auth-helpers";
import { getMemberIds } from "@/lib/services/members";
import { getExpensesForSettlement } from "@/lib/services/expenses";
import { settleWorkspace } from "@/lib/algorithms/settlement";
import { generateSettlements } from "@/actions/settlements";
import { json, jsonError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

// GET — current balances + persisted settlements
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    await requireMember(id);
    const memberIds = await getMemberIds(id);
    const expenses = await getExpensesForSettlement(id);
    const { balances, transactions } = settleWorkspace(memberIds, expenses);
    const persisted = await db
      .select()
      .from(settlements)
      .where(eq(settlements.workspaceId, id));
    return json({ balances, transactions, settlements: persisted });
  } catch (err) {
    return jsonError(err);
  }
}

// POST — (re)generate optimised settlements
export async function POST(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const result = await generateSettlements(id);
    if (!result.ok) return json({ error: result.error }, 400);
    return json(result.data, 201);
  } catch (err) {
    return jsonError(err);
  }
}
