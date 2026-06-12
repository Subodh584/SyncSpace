"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteExpense } from "@/actions/expenses";
import { Button } from "@/components/ui/button";

export function DeleteExpense({
  expenseId,
  disabled,
}: {
  expenseId: string;
  /** Locked once a settlement has been marked paid in this workspace. */
  disabled?: boolean;
}) {
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
      disabled={disabled}
      title={
        disabled
          ? "Can't delete — a settlement has already been marked paid. Mark it unpaid first."
          : "Delete expense"
      }
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
