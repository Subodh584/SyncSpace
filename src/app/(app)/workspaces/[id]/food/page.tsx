import { UtensilsCrossed } from "lucide-react";
import { requireMember } from "@/lib/auth-helpers";
import { getWorkspaceMembers } from "@/lib/services/members";
import { listMeals } from "@/lib/services/meals";
import { EmptyState } from "@/components/empty-state";
import { PlanMealDialog } from "@/components/food/plan-meal-dialog";
import { MealCard } from "@/components/food/meal-card";

export default async function FoodPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireMember(id);

  const [meals, members] = await Promise.all([
    listMeals(id),
    getWorkspaceMembers(id),
  ]);

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Food</h1>
          <p className="text-sm text-muted-foreground">
            Plan meals — who&apos;s eating, how many rotis, and what sabzi to
            make.
          </p>
        </div>
        <PlanMealDialog workspaceId={id} members={members} />
      </div>

      {meals.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="No meals planned"
          description="Plan a breakfast, lunch or dinner. Pick who's eating, set rotis, add guests and poll for the sabzi."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {meals.map((m) => (
            <MealCard key={m.id} workspaceId={id} meal={m} />
          ))}
        </div>
      )}
    </div>
  );
}
