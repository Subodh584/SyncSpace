import { eq, desc } from "drizzle-orm";
import { RefreshCw, ArrowRight } from "lucide-react";
import { db } from "@/db";
import { taskRotations } from "@/db/schema";
import { requireMember } from "@/lib/auth-helpers";
import { getWorkspaceMembers } from "@/lib/services/members";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { RotationDialog } from "@/components/rotations/rotation-dialog";
import { RotationActions } from "@/components/rotations/rotation-actions";
import { relativeTime } from "@/lib/utils";

export default async function RotationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireMember(id);

  const [rotations, members] = await Promise.all([
    db
      .select()
      .from(taskRotations)
      .where(eq(taskRotations.workspaceId, id))
      .orderBy(desc(taskRotations.createdAt)),
    getWorkspaceMembers(id),
  ]);
  const nameOf = (uid: string | null) =>
    members.find((m) => m.userId === uid)?.name ?? "—";

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rotations</h1>
          <p className="text-sm text-muted-foreground">
            Recurring responsibilities that rotate through members.
          </p>
        </div>
        <RotationDialog workspaceId={id} members={members} />
      </div>

      {rotations.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="No rotations yet"
          description="Set up recurring chores like cleaning, cooking or grocery runs that rotate automatically."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rotations.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle>{r.title}</CardTitle>
                    {r.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {r.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary">{r.frequency}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="default">{nameOf(r.currentAssigneeId)}</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline">{nameOf(r.nextAssigneeId)}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">
                    next: {nameOf(r.nextAssigneeId)}
                  </span>
                </div>

                {r.history && r.history.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      History
                    </p>
                    <ol className="space-y-1">
                      {[...r.history]
                        .reverse()
                        .slice(0, 4)
                        .map((h, i) => (
                          <li
                            key={i}
                            className="flex items-center justify-between text-xs"
                          >
                            <span>{nameOf(h.userId)}</span>
                            <span className="text-muted-foreground">
                              {relativeTime(h.rotatedAt)}
                            </span>
                          </li>
                        ))}
                    </ol>
                  </div>
                )}

                <RotationActions rotationId={r.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
