"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { moveTask, deleteTask } from "@/actions/tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { cn, initials } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/constants";
import type { MemberWithUser } from "@/lib/services/members";

type Status = "pending" | "in_progress" | "completed";

export interface BoardTask {
  id: string;
  title: string;
  description: string | null;
  difficultyWeight: number;
  priority: string;
  status: Status;
  assignedTo: string | null;
  dueDate: number | null;
}

const COLUMNS: Status[] = ["pending", "in_progress", "completed"];
const PRIORITY_VARIANT: Record<string, "secondary" | "warning" | "destructive"> =
  {
    low: "secondary",
    medium: "warning",
    high: "destructive",
  };

export function TaskBoard({
  workspaceId,
  initialTasks,
  members,
}: {
  workspaceId: string;
  initialTasks: BoardTask[];
  members: MemberWithUser[];
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState<BoardTask[]>(initialTasks);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<Status | null>(null);

  const memberById = new Map(members.map((m) => [m.userId, m]));

  async function handleDrop(status: Status) {
    setOverCol(null);
    if (!dragId) return;
    const task = tasks.find((t) => t.id === dragId);
    setDragId(null);
    if (!task || task.status === status) return;

    const position = tasks.filter((t) => t.status === status).length;
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status } : t)),
    );
    const res = await moveTask({ id: task.id, status, position });
    if (!res.ok) {
      toast.error(res.error);
      setTasks(initialTasks);
    } else {
      router.refresh();
    }
  }

  async function handleDelete(id: string) {
    const res = await deleteTask(id);
    if (!res.ok) return toast.error(res.error);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    toast.success("Task deleted");
    router.refresh();
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col);
        return (
          <div
            key={col}
            onDragOver={(e) => {
              e.preventDefault();
              setOverCol(col);
            }}
            onDragLeave={() => setOverCol((c) => (c === col ? null : c))}
            onDrop={() => handleDrop(col)}
            className={cn(
              "rounded-xl border bg-muted/30 p-3 transition-colors",
              overCol === col && "ring-2 ring-primary",
            )}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold">{STATUS_LABELS[col]}</h3>
              <Badge variant="secondary">{colTasks.length}</Badge>
            </div>
            <div className="space-y-2">
              {colTasks.map((t) => {
                const assignee = t.assignedTo
                  ? memberById.get(t.assignedTo)
                  : null;
                return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => setDragId(null)}
                    className={cn(
                      "group cursor-grab rounded-lg border bg-card p-3 shadow-sm active:cursor-grabbing",
                      dragId === t.id && "opacity-50",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            t.status === "completed" &&
                              "text-muted-foreground line-through",
                          )}
                        >
                          {t.title}
                        </p>
                        {t.description && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {t.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant={PRIORITY_VARIANT[t.priority]}
                            className="text-[10px]"
                          >
                            {t.priority}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            ⚖ {t.difficultyWeight}
                          </Badge>
                          {assignee && (
                            <span className="ml-auto flex items-center gap-1">
                              <Avatar className="h-5 w-5">
                                {assignee.image && (
                                  <AvatarImage src={assignee.image} />
                                )}
                                <AvatarFallback className="text-[9px]">
                                  {initials(assignee.name)}
                                </AvatarFallback>
                              </Avatar>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 hidden justify-end gap-1 group-hover:flex">
                      <TaskDialog
                        workspaceId={workspaceId}
                        members={members}
                        task={t}
                        trigger={
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDelete(t.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {colTasks.length === 0 && (
                <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                  Drop tasks here
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
