import { eq } from "drizzle-orm";
import { ArrowRight, Scale } from "lucide-react";
import { db } from "@/db";
import { settlements as settlementsTable } from "@/db/schema";
import { requireMember } from "@/lib/auth-helpers";
import { getWorkspaceMembers, getMemberIds } from "@/lib/services/members";
import { getExpensesForSettlement } from "@/lib/services/expenses";
import { settleWorkspace } from "@/lib/algorithms/settlement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/empty-state";
import {
  GenerateSettlements,
  MarkPaid,
  MarkUnpaid,
} from "@/components/settlements/settlement-controls";
import { formatCurrency, initials, cn } from "@/lib/utils";

export default async function SettlementsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user: me } = await requireMember(id);

  const [members, memberIds, expenses, persisted] = await Promise.all([
    getWorkspaceMembers(id),
    getMemberIds(id),
    getExpensesForSettlement(id),
    db
      .select()
      .from(settlementsTable)
      .where(eq(settlementsTable.workspaceId, id)),
  ]);

  const pending = persisted.filter((s) => s.status === "pending");
  const completed = persisted.filter((s) => s.status === "completed");

  // Offset balances by payments already marked paid so the displayed net
  // matches what recalculation produces.
  const { balances } = settleWorkspace(
    memberIds,
    expenses,
    completed.map((s) => ({
      from: s.fromUserId,
      to: s.toUserId,
      amount: s.amount,
    })),
  );
  const memberById = new Map(members.map((m) => [m.userId, m]));
  const nameOf = (uid: string) => memberById.get(uid)?.name ?? "Unknown";

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settlements</h1>
          <p className="text-sm text-muted-foreground">
            Optimised to minimise the number of transactions.
          </p>
        </div>
        <GenerateSettlements workspaceId={id} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Member balances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {balances.map((b) => {
              const m = memberById.get(b.userId);
              return (
                <div key={b.userId} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    {m?.image && <AvatarImage src={m.image} />}
                    <AvatarFallback className="text-xs">
                      {initials(m?.name ?? "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {m?.name ?? "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Paid {formatCurrency(b.totalPaid)} · Owed{" "}
                      {formatCurrency(b.totalOwed)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      b.net > 0.01
                        ? "text-emerald-600"
                        : b.net < -0.01
                          ? "text-rose-600"
                          : "text-muted-foreground",
                    )}
                  >
                    {b.net > 0 ? "+" : ""}
                    {formatCurrency(b.net)}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Who pays whom</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.length === 0 && completed.length === 0 ? (
              <EmptyState
                icon={Scale}
                title="Nothing to settle"
                description="Add expenses then recalculate to generate optimised settlements."
                className="border-0 py-8"
              />
            ) : (
              <>
                {pending.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-lg border p-3"
                  >
                    <div className="flex min-w-0 flex-1 basis-full items-center gap-2 sm:basis-0">
                      <span className="truncate text-sm font-medium">
                        {nameOf(s.fromUserId)}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm font-medium">
                        {nameOf(s.toUserId)}
                      </span>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(s.amount)}
                    </span>
                    <MarkPaid
                      settlementId={s.id}
                      isReceiver={me.id === s.toUserId}
                    />
                  </div>
                ))}
                {completed.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-lg border border-dashed p-3 opacity-70"
                  >
                    <div className="flex min-w-0 flex-1 basis-full items-center gap-2 sm:basis-0">
                      <span className="truncate text-sm">
                        {nameOf(s.fromUserId)}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm">
                        {nameOf(s.toUserId)}
                      </span>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(s.amount)}
                    </span>
                    <Badge variant="success">Paid</Badge>
                    <MarkUnpaid
                      settlementId={s.id}
                      isReceiver={me.id === s.toUserId}
                    />
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
