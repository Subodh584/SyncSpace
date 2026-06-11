"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shuffle } from "lucide-react";
import { toast } from "sonner";
import { autoAssign } from "@/actions/tasks";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ASSIGNMENT_STRATEGIES, STRATEGY_LABELS } from "@/lib/constants";
import type { AssignmentStrategy } from "@/lib/algorithms/assignment";

export function AutoAssign({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run(strategy: AssignmentStrategy) {
    setLoading(true);
    const res = await autoAssign({
      workspaceId,
      strategy,
      onlyUnassigned: true,
    });
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(`Assigned ${res.data.assigned} task(s) by ${STRATEGY_LABELS[strategy]}`);
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={loading}>
          <Shuffle className="h-4 w-4" />
          {loading ? "Assigning…" : "Auto-assign"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Distribute unassigned tasks</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ASSIGNMENT_STRATEGIES.map((s) => (
          <DropdownMenuItem key={s} onClick={() => run(s)}>
            {STRATEGY_LABELS[s]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
