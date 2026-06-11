import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { expenses, expenseSplits } from "@/db/schema";
import type { ExpenseInput } from "@/lib/algorithms/settlement";

/** Expenses + their splits, shaped for the settlement engine. */
export async function getExpensesForSettlement(
  workspaceId: string,
): Promise<ExpenseInput[]> {
  const exps = await db
    .select()
    .from(expenses)
    .where(eq(expenses.workspaceId, workspaceId));
  if (exps.length === 0) return [];

  const result: ExpenseInput[] = [];
  for (const e of exps) {
    const splits = await db
      .select()
      .from(expenseSplits)
      .where(eq(expenseSplits.expenseId, e.id));
    result.push({
      amount: e.amount,
      paidBy: e.paidBy,
      splits: splits.map((s) => ({ userId: s.userId, amount: s.amount })),
    });
  }
  return result;
}

export async function listExpenses(workspaceId: string) {
  return db
    .select()
    .from(expenses)
    .where(eq(expenses.workspaceId, workspaceId))
    .orderBy(desc(expenses.date));
}
