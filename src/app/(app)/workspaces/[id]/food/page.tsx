import { requireMember } from "@/lib/auth-helpers";
import { getWorkspaceMembers } from "@/lib/services/members";
import { getFoodBoard, cleanupPastMeals } from "@/lib/services/meals";
import { CookFrequency } from "@/components/food/cook-frequency";
import { PlanMealDialog } from "@/components/food/plan-meal-dialog";
import { MealCard } from "@/components/food/meal-card";

export default async function FoodPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireMember(id);

  // Roll over at midnight: clear the previous day's plan. Tomorrow's plan
  // becomes today's automatically since meals are bucketed by calendar day.
  await cleanupPastMeals(id);

  const [board, members] = await Promise.all([
    getFoodBoard(id),
    getWorkspaceMembers(id),
  ]);

  const days = [
    { key: "today" as const, label: "Today's plan", meals: board.today },
    { key: "tomorrow" as const, label: "Tomorrow's plan", meals: board.tomorrow },
  ];

  return (
    <div className="container py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Food</h1>
          <p className="text-sm text-muted-foreground">
            Plan each meal — who&apos;s eating, how many rotis, and what sabzi to
            make.
          </p>
        </div>
        <CookFrequency workspaceId={id} value={board.cookMealsPerDay} />
      </div>

      <div className="space-y-8">
        {days.map((d) => (
          <section key={d.key}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{d.label}</h2>
              <PlanMealDialog
                workspaceId={id}
                day={d.key}
                members={members}
                cookMealsPerDay={board.cookMealsPerDay}
                takenSlots={d.meals.map((m) => m.slot)}
              />
            </div>
            {d.meals.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No meals planned yet — up to {board.cookMealsPerDay} meal
                {board.cookMealsPerDay === 1 ? "" : "s"} a day.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {d.meals.map((m) => (
                  <MealCard key={m.id} workspaceId={id} meal={m} />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
