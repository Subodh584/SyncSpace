"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Ban, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { setMealSkipped } from "@/actions/meals";
import { Button } from "@/components/ui/button";

export function SkipMealToggle({
  mealId,
  skipped,
}: {
  mealId: string;
  skipped: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const res = await setMealSkipped({ mealId, skipped: !skipped });
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(skipped ? "Meal restored" : "Meal skipped");
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={toggle} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : skipped ? (
        <Undo2 className="h-4 w-4" />
      ) : (
        <Ban className="h-4 w-4" />
      )}
      {skipped ? "Unskip meal" : "Skip meal"}
    </Button>
  );
}
