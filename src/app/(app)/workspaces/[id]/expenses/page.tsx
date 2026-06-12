import { Coins, Plus } from "lucide-react";
import { requireMember } from "@/lib/auth-helpers";
import { getCurrentUser } from "@/lib/current-user";
import { getWorkspaceMembers } from "@/lib/services/members";
import { listExpenses } from "@/lib/services/expenses";
import { hasCompletedSettlements } from "@/lib/services/settlements";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { ExpenseDialog } from "@/components/expenses/expense-dialog";
import { DeleteExpense } from "@/components/expenses/delete-expense";
import { formatCurrency } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/lib/constants";

export default async function ExpensesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireMember(id);
  const [user, members, expenses, locked] = await Promise.all([
    getCurrentUser(),
    getWorkspaceMembers(id),
    listExpenses(id),
    hasCompletedSettlements(id),
  ]);
  const nameOf = (uid: string) =>
    members.find((m) => m.userId === uid)?.name ?? "Unknown";
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(total)} across {expenses.length} expense
            {expenses.length === 1 ? "" : "s"}
          </p>
        </div>
        <ExpenseDialog
          workspaceId={id}
          members={members}
          currentUserId={user.id}
          trigger={
            <Button>
              <Plus className="h-4 w-4" /> Add expense
            </Button>
          }
        />
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          icon={Coins}
          title="No expenses yet"
          description="Track shared costs and split them across the group. Then generate optimised settlements."
        />
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {expenses.map((e) => (
              <div key={e.id} className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Coins className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{e.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Paid by {nameOf(e.paidBy)} ·{" "}
                    {e.date.toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="secondary">
                  {CATEGORY_LABELS[e.category]}
                </Badge>
                <span className="w-24 text-right font-semibold">
                  {formatCurrency(e.amount)}
                </span>
                <DeleteExpense expenseId={e.id} disabled={locked} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
