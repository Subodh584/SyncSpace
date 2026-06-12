"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteMeal } from "@/actions/meals";
import { Button } from "@/components/ui/button";

export function DeleteMeal({
  mealId,
  workspaceId,
}: {
  mealId: string;
  workspaceId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (!confirm("Delete this meal?")) return;
    setLoading(true);
    const res = await deleteMeal({ mealId });
    if (!res.ok) {
      setLoading(false);
      return toast.error(res.error);
    }
    toast.success("Meal deleted");
    router.push(`/workspaces/${workspaceId}/food`);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 text-destructive"
      onClick={onDelete}
      disabled={loading}
      title="Delete meal"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  );
}
