"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createMeal } from "@/actions/meals";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MemberWithUser } from "@/lib/services/members";

export function PlanMealDialog({
  workspaceId,
  day,
  members,
  cookMealsPerDay,
  takenSlots,
}: {
  workspaceId: string;
  day: "today" | "tomorrow";
  members: MemberWithUser[];
  cookMealsPerDay: number;
  takenSlots: number[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const availableSlots = Array.from(
    { length: cookMealsPerDay },
    (_, i) => i + 1,
  ).filter((s) => !takenSlots.includes(s));

  const [slot, setSlot] = useState(String(availableSlots[0] ?? 1));
  const [skip, setSkip] = useState(false);
  const [included, setIncluded] = useState<Record<string, boolean>>(
    Object.fromEntries(members.map((m) => [m.userId, true])),
  );

  const full = availableSlots.length === 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const memberIds = members
      .filter((m) => included[m.userId])
      .map((m) => m.userId);
    setLoading(true);
    const res = await createMeal({
      workspaceId,
      day,
      slot: Number(slot),
      memberIds,
      skipped: skip,
    });
    if (!res.ok) {
      setLoading(false);
      return toast.error(res.error);
    }
    if (skip) {
      setLoading(false);
      setOpen(false);
      toast.success(`Meal ${slot} skipped`);
      router.refresh();
    } else {
      // Keep the loader running until the meal page loads — the dialog
      // unmounts on navigation.
      router.push(`/workspaces/${workspaceId}/food/${res.data.id}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={full} title={full ? "All meals planned" : undefined}>
          <Plus className="h-4 w-4" /> Plan a meal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Plan a meal — {day === "today" ? "Today" : "Tomorrow"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Which meal?</Label>
            <Select value={slot} onValueChange={setSlot}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableSlots.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    Meal {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm">
            <input
              type="checkbox"
              checked={skip}
              onChange={(e) => setSkip(e.target.checked)}
            />
            <span>Skip this meal (cook won&apos;t cook it)</span>
          </label>

          {!skip && (
            <div className="space-y-2">
              <Label>Who&apos;s eating?</Label>
              <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border p-2">
                {members.map((m) => (
                  <label
                    key={m.userId}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={included[m.userId] ?? true}
                      onChange={(e) =>
                        setIncluded((prev) => ({
                          ...prev,
                          [m.userId]: e.target.checked,
                        }))
                      }
                    />
                    <span className="flex-1 truncate">{m.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Set each person&apos;s rotis and vote on the sabzi on the next
                screen.
              </p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading || full}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Saving…" : skip ? "Skip meal" : "Plan meal"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
