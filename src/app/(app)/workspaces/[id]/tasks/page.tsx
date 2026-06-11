import { desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { requireMember } from "@/lib/auth-helpers";
import { getWorkspaceMembers } from "@/lib/services/members";
import { Button } from "@/components/ui/button";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { AutoAssign } from "@/components/tasks/auto-assign";
import { TaskBoard, type BoardTask } from "@/components/tasks/task-board";

export default async function TasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireMember(id);
  const [rows, members] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(eq(tasks.workspaceId, id))
      .orderBy(desc(tasks.position), desc(tasks.createdAt)),
    getWorkspaceMembers(id),
  ]);

  const boardTasks: BoardTask[] = rows.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    difficultyWeight: t.difficultyWeight,
    priority: t.priority,
    status: t.status,
    assignedTo: t.assignedTo,
    dueDate: t.dueDate ? Math.floor(t.dueDate.getTime() / 1000) : null,
  }));

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            Drag cards between columns to update status.
          </p>
        </div>
        <div className="flex gap-2">
          <AutoAssign workspaceId={id} />
          <TaskDialog
            workspaceId={id}
            members={members}
            trigger={
              <Button>
                <Plus className="h-4 w-4" /> New task
              </Button>
            }
          />
        </div>
      </div>
      <TaskBoard
        workspaceId={id}
        initialTasks={boardTasks}
        members={members}
      />
    </div>
  );
}
