"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createExpense } from "@/actions/expenses";
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
import { EXPENSE_CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";
import { calculateSplits, type SplitMethod } from "@/lib/algorithms/splits";
import { formatCurrency, round2 } from "@/lib/utils";
import type { MemberWithUser } from "@/lib/services/members";

export function ExpenseDialog({
  workspaceId,
  members,
  currentUserId,
  trigger,
}: {
  workspaceId: string;
  members: MemberWithUser[];
  currentUserId: string;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("misc");
  const [splitMethod, setSplitMethod] = useState<SplitMethod>("equal");
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [included, setIncluded] = useState<Record<string, boolean>>(
    Object.fromEntries(members.map((m) => [m.userId, true])),
  );
  const [values, setValues] = useState<Record<string, string>>({});

  const total = Number(amount) || 0;

  const preview = useMemo(() => {
    const memberInputs = members.map((m) => ({
      userId: m.userId,
      value: Number(values[m.userId]) || 0,
      included: included[m.userId],
    }));
    return calculateSplits(splitMethod, total, memberInputs);
  }, [members, values, included, splitMethod, total]);

  const previewSum = round2(preview.reduce((s, p) => s + p.amount, 0));
  const balanced = Math.abs(previewSum - total) <= 0.01;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const memberInputs = members.map((m) => ({
      userId: m.userId,
      value: Number(values[m.userId]) || 0,
      included: included[m.userId],
    }));
    setLoading(true);
    const res = await createExpense({
      workspaceId,
      amount: total,
      description: form.get("description"),
      category,
      splitMethod,
      paidBy,
      members: memberInputs,
    });
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Expense added");
    setOpen(false);
    setAmount("");
    setValues({});
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Paid by</Label>
              <Select value={paidBy} onValueChange={setPaidBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Split method</Label>
              <Select
                value={splitMethod}
                onValueChange={(v) => setSplitMethod(v as SplitMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equal">Equal</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed amount</SelectItem>
                  <SelectItem value="custom">Custom participants</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Participants</Label>
            <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border p-2">
              {members.map((m) => {
                const share = preview.find((p) => p.userId === m.userId);
                return (
                  <div
                    key={m.userId}
                    className="flex items-center gap-2 text-sm"
                  >
                    {(splitMethod === "custom" || splitMethod === "equal") && (
                      <input
                        type="checkbox"
                        checked={included[m.userId] ?? true}
                        disabled={splitMethod === "equal"}
                        onChange={(e) =>
                          setIncluded((prev) => ({
                            ...prev,
                            [m.userId]: e.target.checked,
                          }))
                        }
                      />
                    )}
                    <span className="flex-1 truncate">{m.name}</span>
                    {splitMethod === "percentage" && (
                      <Input
                        type="number"
                        className="h-7 w-20"
                        placeholder="%"
                        value={values[m.userId] ?? ""}
                        onChange={(e) =>
                          setValues((p) => ({
                            ...p,
                            [m.userId]: e.target.value,
                          }))
                        }
                      />
                    )}
                    {splitMethod === "fixed" && (
                      <Input
                        type="number"
                        className="h-7 w-24"
                        placeholder="₹"
                        value={values[m.userId] ?? ""}
                        onChange={(e) =>
                          setValues((p) => ({
                            ...p,
                            [m.userId]: e.target.value,
                          }))
                        }
                      />
                    )}
                    <span className="w-20 text-right text-muted-foreground">
                      {formatCurrency(share?.amount ?? 0)}
                    </span>
                  </div>
                );
              })}
            </div>
            <p
              className={
                balanced
                  ? "text-xs text-muted-foreground"
                  : "text-xs text-destructive"
              }
            >
              Split total: {formatCurrency(previewSum)} / {formatCurrency(total)}
              {!balanced && " — must match the amount"}
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !balanced || total <= 0}
          >
            {loading ? "Adding…" : "Add expense"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
