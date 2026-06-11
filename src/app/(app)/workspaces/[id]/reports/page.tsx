import { requireMember } from "@/lib/auth-helpers";
import { getWorkspaceMembers } from "@/lib/services/members";
import { getWorkspaceFairness } from "@/lib/services/fairness";
import { fairnessLabel } from "@/lib/algorithms/fairness";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReportDownloads } from "@/components/reports/report-downloads";
import { initials, cn } from "@/lib/utils";

function toneClass(tone: "good" | "ok" | "bad") {
  return tone === "good"
    ? "bg-emerald-500"
    : tone === "ok"
      ? "bg-amber-500"
      : "bg-rose-500";
}

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireMember(id);

  const [members, fairness] = await Promise.all([
    getWorkspaceMembers(id),
    getWorkspaceFairness(id),
  ]);
  const memberById = new Map(members.map((m) => [m.userId, m]));
  const overall = fairnessLabel(fairness.workspaceScore);

  return (
    <div className="container space-y-8 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports & fairness</h1>
        <p className="text-sm text-muted-foreground">
          See how fairly work and money are shared, then export the data.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Workspace fairness</CardTitle>
            <Badge
              variant={
                overall.tone === "good"
                  ? "success"
                  : overall.tone === "ok"
                    ? "warning"
                    : "destructive"
              }
            >
              {fairness.workspaceScore} · {overall.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress
            value={fairness.workspaceScore}
            indicatorClassName={toneClass(overall.tone)}
          />
          <div className="space-y-4 pt-2">
            {fairness.members.map((s) => {
              const m = memberById.get(s.userId);
              const tone = fairnessLabel(s.overall).tone;
              return (
                <div key={s.userId} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      {m?.image && <AvatarImage src={m.image} />}
                      <AvatarFallback className="text-[10px]">
                        {initials(m?.name ?? "?")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm font-medium">
                      {m?.name ?? "Unknown"}
                    </span>
                    <span className="text-sm font-semibold">{s.overall}</span>
                  </div>
                  <Progress
                    value={s.overall}
                    indicatorClassName={cn(toneClass(tone))}
                  />
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Tasks: {s.taskScore}</span>
                    <span>Expenses: {s.expenseScore}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export reports</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportDownloads workspaceId={id} />
        </CardContent>
      </Card>
    </div>
  );
}
