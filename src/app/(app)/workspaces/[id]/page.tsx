import { and, desc, eq, sql } from "drizzle-orm";
import {
  Users,
  CheckSquare,
  CircleCheck,
  Coins,
  Scale,
  Activity as ActivityIcon,
} from "lucide-react";
import { db } from "@/db";
import {
  workspaceMembers,
  tasks,
  expenses,
  settlements,
  activityLogs,
} from "@/db/schema";
import { requireMember } from "@/lib/auth-helpers";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency, relativeTime } from "@/lib/utils";

async function count(table: typeof tasks, where: ReturnType<typeof eq>) {
  const r = await db
    .select({ c: sql<number>`count(*)` })
    .from(table)
    .where(where);
  return r[0]?.c ?? 0;
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireMember(id);

  const [
    memberCount,
    pendingCount,
    completedCount,
    expenseAgg,
    outstanding,
    recent,
  ] = await Promise.all([
    db
      .select({ c: sql<number>`count(*)` })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, id))
      .then((r) => r[0]?.c ?? 0),
    count(
      tasks,
      and(eq(tasks.workspaceId, id), sql`${tasks.status} != 'completed'`)!,
    ),
    count(
      tasks,
      and(eq(tasks.workspaceId, id), eq(tasks.status, "completed"))!,
    ),
    db
      .select({ total: sql<number>`coalesce(sum(${expenses.amount}), 0)` })
      .from(expenses)
      .where(eq(expenses.workspaceId, id))
      .then((r) => r[0]?.total ?? 0),
    db
      .select({ c: sql<number>`count(*)` })
      .from(settlements)
      .where(
        and(
          eq(settlements.workspaceId, id),
          eq(settlements.status, "pending"),
        ),
      )
      .then((r) => r[0]?.c ?? 0),
    db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.workspaceId, id))
      .orderBy(desc(activityLogs.createdAt))
      .limit(12),
  ]);

  return (
    <div className="container py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Members" value={memberCount} icon={Users} />
        <StatCard
          label="Pending tasks"
          value={pendingCount}
          icon={CheckSquare}
          accent="bg-amber-500/10 text-amber-600"
        />
        <StatCard
          label="Completed tasks"
          value={completedCount}
          icon={CircleCheck}
          accent="bg-emerald-500/10 text-emerald-600"
        />
        <StatCard
          label="Total expenses"
          value={formatCurrency(expenseAgg)}
          icon={Coins}
          accent="bg-violet-500/10 text-violet-600"
        />
        <StatCard
          label="Outstanding"
          value={outstanding}
          icon={Scale}
          accent="bg-rose-500/10 text-rose-600"
        />
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <EmptyState
              icon={ActivityIcon}
              title="No activity yet"
              description="Tasks, expenses and settlements will show up here as your workspace gets going."
              className="border-0 py-10"
            />
          ) : (
            <ol className="space-y-4">
              {recent.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm">{a.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {relativeTime(a.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
