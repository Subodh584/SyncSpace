"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Wheat,
  CookingPot,
  Users,
  Ban,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { setMealSkipped, deleteMeal } from "@/actions/meals";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MealListItem } from "@/lib/services/meals";

export function MealCard({
  workspaceId,
  meal,
}: {
  workspaceId: string;
  meal: MealListItem;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  function open() {
    if (meal.skipped) return;
    startTransition(() =>
      router.push(`/workspaces/${workspaceId}/food/${meal.id}`),
    );
  }

  async function toggleSkip() {
    setBusy(true);
    const res = await setMealSkipped({ mealId: meal.id, skipped: !meal.skipped });
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Delete Meal ${meal.slot}?`)) return;
    setBusy(true);
    const res = await deleteMeal({ mealId: meal.id });
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Meal removed");
    router.refresh();
  }

  const { summary } = meal;

  return (
    <Card
      className={cn(
        "relative h-full",
        meal.skipped && "opacity-70",
        isPending && "opacity-70",
      )}
    >
      {isPending && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/50">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold">Meal {meal.slot}</span>
          {meal.skipped && (
            <Badge variant="outline" className="gap-1">
              <Ban className="h-3 w-3" /> Skipped
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {meal.skipped ? (
          <p className="text-muted-foreground">No cooking for this meal.</p>
        ) : (
          <button
            type="button"
            onClick={open}
            className="block w-full space-y-2 text-left"
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" /> {summary.eatingCount} eating
              </span>
              <span className="flex items-center gap-1">
                <Wheat className="h-4 w-4" /> {summary.totalRotis} rotis
              </span>
              <span className="flex items-center gap-1">
                🍚 {summary.riceEaters} rice
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <CookingPot className="h-4 w-4 text-muted-foreground" />
              {meal.sabzi ? (
                <span className="font-medium">{meal.sabzi}</span>
              ) : (
                <span className="text-muted-foreground">Sabzi not decided</span>
              )}
            </div>
          </button>
        )}

        <div className="flex items-center gap-1 border-t pt-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={toggleSkip}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : meal.skipped ? (
              <Undo2 className="h-3.5 w-3.5" />
            ) : (
              <Ban className="h-3.5 w-3.5" />
            )}
            {meal.skipped ? "Unskip" : "Skip meal"}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="ml-auto h-7 w-7 text-destructive"
            onClick={remove}
            disabled={busy}
            title="Remove meal"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
