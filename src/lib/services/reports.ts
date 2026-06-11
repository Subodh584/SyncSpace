import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks, expenses, settlements } from "@/db/schema";
import { getWorkspaceMembers } from "@/lib/services/members";
import { getMemberIds } from "@/lib/services/members";
import { getExpensesForSettlement } from "@/lib/services/expenses";
import { settleWorkspace } from "@/lib/algorithms/settlement";
import { computeFairness } from "@/lib/algorithms/fairness";
import { STATUS_LABELS, CATEGORY_LABELS } from "@/lib/constants";

export type ReportType = "task" | "expense" | "settlement" | "fairness";

export interface ReportData {
  title: string;
  columns: string[];
  rows: (string | number)[][];
}

export async function buildReport(
  workspaceId: string,
  type: ReportType,
): Promise<ReportData> {
  const members = await getWorkspaceMembers(workspaceId);
  const nameOf = (id: string | null) =>
    members.find((m) => m.userId === id)?.name ?? "Unassigned";

  switch (type) {
    case "task": {
      const rows = await db
        .select()
        .from(tasks)
        .where(eq(tasks.workspaceId, workspaceId));
      return {
        title: "Task Report",
        columns: ["Title", "Status", "Priority", "Difficulty", "Assigned To"],
        rows: rows.map((t) => [
          t.title,
          STATUS_LABELS[t.status] ?? t.status,
          t.priority,
          t.difficultyWeight,
          nameOf(t.assignedTo),
        ]),
      };
    }
    case "expense": {
      const rows = await db
        .select()
        .from(expenses)
        .where(eq(expenses.workspaceId, workspaceId));
      return {
        title: "Expense Report",
        columns: ["Description", "Category", "Amount", "Paid By", "Date"],
        rows: rows.map((e) => [
          e.description,
          CATEGORY_LABELS[e.category] ?? e.category,
          e.amount,
          nameOf(e.paidBy),
          e.date.toISOString().slice(0, 10),
        ]),
      };
    }
    case "settlement": {
      const rows = await db
        .select()
        .from(settlements)
        .where(eq(settlements.workspaceId, workspaceId));
      return {
        title: "Settlement Report",
        columns: ["From", "To", "Amount", "Status"],
        rows: rows.map((s) => [
          nameOf(s.fromUserId),
          nameOf(s.toUserId),
          s.amount,
          s.status,
        ]),
      };
    }
    case "fairness": {
      const memberIds = await getMemberIds(workspaceId);
      const exps = await getExpensesForSettlement(workspaceId);
      const { balances } = settleWorkspace(memberIds, exps);
      const taskRows = await db
        .select()
        .from(tasks)
        .where(eq(tasks.workspaceId, workspaceId));
      const weightByUser = new Map<string, number>();
      for (const t of taskRows) {
        if (t.assignedTo)
          weightByUser.set(
            t.assignedTo,
            (weightByUser.get(t.assignedTo) ?? 0) + t.difficultyWeight,
          );
      }
      const { members: scores } = computeFairness(
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
      return {
        title: "Fairness Report",
        columns: ["Member", "Task Score", "Expense Score", "Overall"],
        rows: scores.map((s) => [
          nameOf(s.userId),
          s.taskScore,
          s.expenseScore,
          s.overall,
        ]),
      };
    }
  }
}
