"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { settlements } from "@/db/schema";
import { genId } from "@/lib/ids";
import { markSettledSchema } from "@/lib/validations";
import { requireMember, AuthError } from "@/lib/auth-helpers";
import { logActivity, notify } from "@/lib/services/activity";
import { getMemberIds } from "@/lib/services/members";
import { getExpensesForSettlement } from "@/lib/services/expenses";
import { settleWorkspace } from "@/lib/algorithms/settlement";
import { formatCurrency } from "@/lib/utils";
import { type ActionResult, fail, ok } from "@/lib/action";

/**
 * Recompute optimised settlements from current expenses. Existing *pending*
 * settlements are replaced; completed ones are kept as history.
 */
export async function generateSettlements(
  workspaceId: string,
): Promise<ActionResult<{ count: number }>> {
  try {
    await requireMember(workspaceId);
    const memberIds = await getMemberIds(workspaceId);
    const expenses = await getExpensesForSettlement(workspaceId);
    const { transactions } = settleWorkspace(memberIds, expenses);

    await db
      .delete(settlements)
      .where(
        and(
          eq(settlements.workspaceId, workspaceId),
          eq(settlements.status, "pending"),
        ),
      );

    if (transactions.length > 0) {
      await db.insert(settlements).values(
        transactions.map((t) => ({
          id: genId(),
          workspaceId,
          fromUserId: t.from,
          toUserId: t.to,
          amount: t.amount,
          status: "pending" as const,
        })),
      );
    }

    revalidatePath(`/workspaces/${workspaceId}/settlements`);
    return ok({ count: transactions.length });
  } catch (err) {
    return fail(err);
  }
}

export async function markSettlementPaid(
  raw: unknown,
): Promise<ActionResult> {
  try {
    const input = markSettledSchema.parse(raw);
    const existing = await db
      .select()
      .from(settlements)
      .where(eq(settlements.id, input.settlementId))
      .limit(1);
    if (!existing[0]) throw new AuthError("Settlement not found", 404);
    const s = existing[0];
    const { user: me } = await requireMember(s.workspaceId);

    await db
      .update(settlements)
      .set({ status: "completed", settledAt: new Date(), updatedAt: new Date() })
      .where(eq(settlements.id, s.id));

    await logActivity({
      workspaceId: s.workspaceId,
      actorId: me.id,
      type: "settlement_completed",
      message: `A settlement of ${formatCurrency(s.amount)} was marked paid`,
      metadata: { settlementId: s.id },
    });
    // Notify both parties (besides the actor).
    for (const uid of [s.fromUserId, s.toUserId]) {
      if (uid !== me.id) {
        await notify({
          userId: uid,
          workspaceId: s.workspaceId,
          type: "settlement_completed",
          title: "Settlement completed",
          body: `A settlement of ${formatCurrency(s.amount)} was marked paid`,
          link: `/workspaces/${s.workspaceId}/settlements`,
        });
      }
    }

    revalidatePath(`/workspaces/${s.workspaceId}/settlements`);
    return ok(null);
  } catch (err) {
    return fail(err);
  }
}
