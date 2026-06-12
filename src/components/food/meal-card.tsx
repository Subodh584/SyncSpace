"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wheat, CookingPot, Users } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MEAL_TYPE_LABELS } from "@/lib/constants";
import { cn, relativeDay } from "@/lib/utils";
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

  function open() {
    startTransition(() =>
      router.push(`/workspaces/${workspaceId}/food/${meal.id}`),
    );
  }

  const { summary } = meal;

  return (
    <button type="button" onClick={open} className="text-left">
      <Card
        className={cn(
          "relative h-full transition-shadow hover:shadow-md",
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
            <div className="flex items-center gap-2">
              <span className="font-semibold">{MEAL_TYPE_LABELS[meal.type]}</span>
              <Badge variant={meal.status === "open" ? "secondary" : "outline"}>
                {meal.status === "open" ? "Open" : "Closed"}
              </Badge>
            </div>
            {meal.isNext ? (
              <Badge variant="success">Next meal</Badge>
            ) : (
              <span className="text-xs text-muted-foreground">
                {relativeDay(meal.date)}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
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
        </CardContent>
      </Card>
    </button>
  );
}
