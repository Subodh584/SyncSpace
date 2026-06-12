"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Check, Lock, RotateCcw, Trophy } from "lucide-react";
import { toast } from "sonner";
import {
  votePoll,
  addPollOption,
  finalizePoll,
  reopenPoll,
} from "@/actions/meals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { POLL_CATEGORY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { PollView } from "@/lib/services/meals";

export function MealPoll({
  poll,
  canFinalize,
}: {
  poll: PollView;
  /** Meal creator or workspace owner — may finalize / reopen. */
  canFinalize: boolean;
}) {
  const router = useRouter();
  const [busyOption, setBusyOption] = useState<string | null>(null);
  const [newOption, setNewOption] = useState("");
  const [addingOption, setAddingOption] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const closed = poll.status === "closed";
  const totalVotes = poll.options.reduce((s, o) => s + o.votes, 0);

  async function vote(optionId: string) {
    setBusyOption(optionId);
    const res = await votePoll({ pollId: poll.id, optionId });
    setBusyOption(null);
    if (!res.ok) return toast.error(res.error);
    router.refresh();
  }

  async function finalize(optionId: string) {
    setFinalizing(true);
    const res = await finalizePoll({ pollId: poll.id, optionId });
    setFinalizing(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Decided");
    router.refresh();
  }

  async function reopen() {
    setFinalizing(true);
    const res = await reopenPoll({ pollId: poll.id });
    setFinalizing(false);
    if (!res.ok) return toast.error(res.error);
    router.refresh();
  }

  async function addOption(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newOption.trim()) return;
    setAddingOption(true);
    const res = await addPollOption({ pollId: poll.id, label: newOption.trim() });
    setAddingOption(false);
    if (!res.ok) return toast.error(res.error);
    setNewOption("");
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{poll.title}</span>
          <Badge variant="secondary" className="text-[10px]">
            {POLL_CATEGORY_LABELS[poll.category]}
          </Badge>
        </div>
        {closed ? (
          <Badge variant="success" className="gap-1">
            <Lock className="h-3 w-3" /> Decided
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">
            {totalVotes} vote{totalVotes === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {poll.options.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No options yet — add one below.
        </p>
      ) : (
        <div className="space-y-2">
          {poll.options.map((o) => {
            const pct = totalVotes ? Math.round((o.votes / totalVotes) * 100) : 0;
            const mine = poll.myOptionId === o.id;
            const won = poll.winningOptionId === o.id;
            return (
              <div key={o.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  {!closed ? (
                    <button
                      type="button"
                      onClick={() => vote(o.id)}
                      disabled={busyOption !== null}
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                        mine
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:bg-accent",
                      )}
                      title={mine ? "Your vote" : "Vote"}
                    >
                      {busyOption === o.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : mine ? (
                        <Check className="h-3 w-3" />
                      ) : null}
                    </button>
                  ) : won ? (
                    <Trophy className="h-5 w-5 shrink-0 text-amber-500" />
                  ) : (
                    <span className="h-6 w-6 shrink-0" />
                  )}
                  <span
                    className={cn(
                      "flex-1 text-sm",
                      won && "font-semibold",
                    )}
                  >
                    {o.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {o.votes}
                  </span>
                  {canFinalize && !closed && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={() => finalize(o.id)}
                      disabled={finalizing}
                    >
                      Finalize
                    </Button>
                  )}
                </div>
                <Progress
                  value={pct}
                  className="h-1.5"
                  indicatorClassName={won ? "bg-amber-500" : undefined}
                />
              </div>
            );
          })}
        </div>
      )}

      {!closed && (
        <form onSubmit={addOption} className="flex items-center gap-2">
          <Input
            placeholder="Add an option (e.g. Aloo Gobi)"
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            className="h-8"
          />
          <Button type="submit" size="sm" variant="outline" disabled={addingOption}>
            {addingOption ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add
          </Button>
        </form>
      )}

      {closed && canFinalize && (
        <Button
          size="sm"
          variant="ghost"
          className="text-xs text-muted-foreground"
          onClick={reopen}
          disabled={finalizing}
        >
          {finalizing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          Reopen voting
        </Button>
      )}
    </div>
  );
}
