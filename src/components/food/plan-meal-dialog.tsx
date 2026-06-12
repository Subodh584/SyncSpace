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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MEAL_TYPES, MEAL_TYPE_LABELS } from "@/lib/constants";
import type { MemberWithUser } from "@/lib/services/members";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function PlanMealDialog({
  workspaceId,
  members,
}: {
  workspaceId: string;
  members: MemberWithUser[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<string>("dinner");
  const [date, setDate] = useState(todayISO());
  const [included, setIncluded] = useState<Record<string, boolean>>(
    Object.fromEntries(members.map((m) => [m.userId, true])),
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const memberIds = members
      .filter((m) => included[m.userId])
      .map((m) => m.userId);
    setLoading(true);
    const res = await createMeal({
      workspaceId,
      type,
      date: new Date(date),
      memberIds,
    });
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(`${MEAL_TYPE_LABELS[type]} planned`);
    setOpen(false);
    router.push(`/workspaces/${workspaceId}/food/${res.data.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Plan a meal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plan a meal</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Meal</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {MEAL_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

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
              You can add guests and set each person&apos;s rotis on the next
              screen.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Planning…" : "Plan meal"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
