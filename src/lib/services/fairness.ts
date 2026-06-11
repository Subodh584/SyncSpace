import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { getMemberIds } from "@/lib/services/members";
import { getExpensesForSettlement } from "@/lib/services/expenses";
import { settleWorkspace } from "@/lib/algorithms/settlement";
import { computeFairness } from "@/lib/algorithms/fairness";

/** Compute fairness scores for every member of a workspace from live data. */
export async function getWorkspaceFairness(workspaceId: string) {
  const [memberIds, expenses, taskRows] = await Promise.all([
    getMemberIds(workspaceId),
    getExpensesForSettlement(workspaceId),
    db.select().from(tasks).where(eq(tasks.workspaceId, workspaceId)),
  ]);

  const { balances } = settleWorkspace(memberIds, expenses);
  const weightByUser = new Map<string, number>();
  for (const t of taskRows) {
    if (t.assignedTo)
      weightByUser.set(
        t.assignedTo,
        (weightByUser.get(t.assignedTo) ?? 0) + t.difficultyWeight,
      );
  }

  return computeFairness(
    memberIds.map((id) => {
      const bal = balances.find((b) => b.userId === id);
      return {
        userId: id,
        taskWeightLoad: weightByUser.get(id) ?? 0,
        totalPaid: bal?.totalPaid ?? 0,
        totalOwed: bal?.totalOwed ?? 0,
      };
    }),
  );
}
