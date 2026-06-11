"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { expenses, expenseSplits } from "@/db/schema";
import { genId } from "@/lib/ids";
import { createExpenseSchema, updateExpenseSchema } from "@/lib/validations";
import { requireMember, getMembership, AuthError } from "@/lib/auth-helpers";
import { logActivity, notifyMany } from "@/lib/services/activity";
import { getMemberIds } from "@/lib/services/members";
import { calculateSplits, validateSplits } from "@/lib/algorithms/splits";
import { formatCurrency } from "@/lib/utils";
import { type ActionResult, fail, ok } from "@/lib/action";

export async function createExpense(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const input = createExpenseSchema.parse(raw);
    const { user: me } = await requireMember(input.workspaceId);

    const payer = await getMembership(input.workspaceId, input.paidBy);
    if (!payer) throw new AuthError("Payer must be a workspace member", 400);

    const splits = calculateSplits(
      input.splitMethod,
      input.amount,
      input.members,
    );
    const check = validateSplits(input.amount, splits);
    if (!check.valid)
      throw new AuthError(
        `Splits (${check.sum}) do not add up to the total (${input.amount})`,
        400,
      );

    const id = genId();
    await db.insert(expenses).values({
      id,
      amount: input.amount,
      description: input.description,
      category: input.category,
      splitMethod: input.splitMethod,
      paidBy: input.paidBy,
      workspaceId: input.workspaceId,
      date: input.date ?? new Date(),
    });
    await db.insert(expenseSplits).values(
      splits.map((s) => ({
        id: genId(),
        expenseId: id,
        userId: s.userId,
        amount: s.amount,
        percentage: s.percentage ?? null,
      })),
    );

    await logActivity({
      workspaceId: input.workspaceId,
      actorId: me.id,
      type: "expense_added",
      message: `${me.name} added an expense “${input.description}” (${formatCurrency(input.amount)})`,
      metadata: { expenseId: id },
    });
    const members = await getMemberIds(input.workspaceId);
    await notifyMany(
      members,
      {
        workspaceId: input.workspaceId,
        type: "expense_added",
        title: "New expense added",
        body: `${input.description} — ${formatCurrency(input.amount)}`,
        link: `/workspaces/${input.workspaceId}/expenses`,
      },
      me.id,
    );

    revalidatePath(`/workspaces/${input.workspaceId}/expenses`);
    return ok({ id });
  } catch (err) {
    return fail(err);
  }
}

export async function updateExpense(raw: unknown): Promise<ActionResult> {
  try {
    const input = updateExpenseSchema.parse(raw);
    const existing = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, input.id))
      .limit(1);
    if (!existing[0]) throw new AuthError("Expense not found", 404);
    await requireMember(existing[0].workspaceId);

    const splits = calculateSplits(
      input.splitMethod,
      input.amount,
      input.members,
    );
    const check = validateSplits(input.amount, splits);
    if (!check.valid)
      throw new AuthError("Splits do not add up to the total", 400);

    await db
      .update(expenses)
      .set({
        amount: input.amount,
        description: input.description,
        category: input.category,
        splitMethod: input.splitMethod,
        paidBy: input.paidBy,
        date: input.date ?? existing[0].date,
        updatedAt: new Date(),
      })
      .where(eq(expenses.id, input.id));

    await db.delete(expenseSplits).where(eq(expenseSplits.expenseId, input.id));
    await db.insert(expenseSplits).values(
      splits.map((s) => ({
        id: genId(),
        expenseId: input.id,
        userId: s.userId,
        amount: s.amount,
        percentage: s.percentage ?? null,
      })),
    );

    revalidatePath(`/workspaces/${existing[0].workspaceId}/expenses`);
    return ok(null);
  } catch (err) {
    return fail(err);
  }
}

export async function deleteExpense(expenseId: string): Promise<ActionResult> {
  try {
    const existing = await db
      .select({ workspaceId: expenses.workspaceId })
      .from(expenses)
      .where(eq(expenses.id, expenseId))
      .limit(1);
    if (!existing[0]) throw new AuthError("Expense not found", 404);
    await requireMember(existing[0].workspaceId);
    await db.delete(expenses).where(eq(expenses.id, expenseId));
    revalidatePath(`/workspaces/${existing[0].workspaceId}/expenses`);
    return ok(null);
  } catch (err) {
    return fail(err);
  }
}
