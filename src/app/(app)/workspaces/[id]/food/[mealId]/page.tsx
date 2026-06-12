import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wheat, CookingPot, Check } from "lucide-react";
import { requireMember } from "@/lib/auth-helpers";
import { getMealDetail } from "@/lib/services/meals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { relativeDay } from "@/lib/utils";
import { ParticipantChoice } from "@/components/food/participant-choice";
import { AddGuest } from "@/components/food/add-guest";
import { MealPoll } from "@/components/food/meal-poll";
import { AddPoll } from "@/components/food/add-poll";
import { DeleteMeal } from "@/components/food/delete-meal";
import { SkipMealToggle } from "@/components/food/skip-meal-toggle";

export default async function MealDetailPage({
  params,
}: {
  params: Promise<{ id: string; mealId: string }>;
}) {
  const { id, mealId } = await params;
  const { user: me, membership } = await requireMember(id);

  const detail = await getMealDetail(mealId, me.id);
  if (!detail || detail.meal.workspaceId !== id) notFound();

  const { meal, participants, polls, summary } = detail;
  const canManage = meal.createdBy === me.id || membership.role === "owner";

  const stats = [
    { label: "Rotis to make", value: summary.totalRotis, icon: "🫓" },
    { label: "Rice eaters", value: summary.riceEaters, icon: "🍚" },
    { label: "Eating", value: summary.eatingCount, icon: "🍽️" },
    { label: "Not eating", value: summary.skipping, icon: "🚫" },
    { label: "Guests", value: summary.guestCount, icon: "🧑‍🤝‍🧑" },
  ];

  return (
    <div className="container py-8">
      <Link
        href={`/workspaces/${id}/food`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All meals
      </Link>

      <div className="mb-6 flex items-start justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            Meal {meal.slot}
            {meal.skipped && (
              <Badge variant="outline">Skipped</Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            {relativeDay(meal.date)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <SkipMealToggle mealId={meal.id} skipped={meal.skipped} />
          {canManage && <DeleteMeal mealId={meal.id} workspaceId={id} />}
        </div>
      </div>

      {meal.skipped && (
        <div className="mb-6 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          This meal is skipped — the cook isn&apos;t cooking it. Unskip to plan
          it.
        </div>
      )}

      {/* Cooking summary — the headline output */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wheat className="h-4 w-4" /> Cooking summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-lg border p-3 text-center"
              >
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Participants */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Who&apos;s eating</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {participants.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No one added yet. Add a guest below.
              </p>
            ) : (
              <div className="space-y-2">
                {participants.map((p) => (
                  <ParticipantChoice key={p.id} p={p} />
                ))}
              </div>
            )}
            <div className="border-t pt-3">
              <AddGuest mealId={meal.id} />
            </div>
          </CardContent>
        </Card>

        {/* Polls */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <CookingPot className="h-4 w-4" /> Decide the menu
              </CardTitle>
              <AddPoll mealId={meal.id} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {polls.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No polls yet — add one to decide the sabzi or grain.
              </p>
            ) : (
              polls.map((poll) => (
                <MealPoll key={poll.id} poll={poll} canFinalize={canManage} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex justify-end">
        <Link
          href={`/workspaces/${id}/food`}
          className={buttonVariants({ size: "lg" })}
        >
          <Check className="h-4 w-4" /> Done
        </Link>
      </div>
    </div>
  );
}
