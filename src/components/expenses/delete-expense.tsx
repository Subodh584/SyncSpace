"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteExpense } from "@/actions/expenses";
import { Button } from "@/components/ui/button";

export function DeleteExpense({ expenseId }: { expenseId: string }) {
  const router = useRouter();
  async function onDelete() {
    const res = await deleteExpense(expenseId);
    if (!res.ok) return toast.error(res.error);
    toast.success("Expense deleted");
    router.refresh();
  }
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-destructive"
      onClick={onDelete}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
