"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createRotation } from "@/actions/rotations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROTATION_FREQUENCIES } from "@/lib/constants";
import type { MemberWithUser } from "@/lib/services/members";

export function RotationDialog({
  workspaceId,
  members,
}: {
  workspaceId: string;
  members: MemberWithUser[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [frequency, setFrequency] = useState("weekly");
  // Ordered list of selected member ids
  const [order, setOrder] = useState<string[]>(members.map((m) => m.userId));

  function toggle(userId: string) {
    setOrder((prev) =>
      prev.includes(userId)
        ? prev.filter((u) => u !== userId)
        : [...prev, userId],
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (order.length === 0) return toast.error("Select at least one member");
    setLoading(true);
    const res = await createRotation({
      workspaceId,
      title: form.get("title"),
      description: form.get("description") || undefined,
      frequency,
      memberOrder: order,
    });
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Rotation created");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> New rotation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New rotation</DialogTitle>
          <DialogDescription>
            Members take turns in the order shown. The first selected member
            goes first.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g. Kitchen cleaning"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" />
          </div>
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROTATION_FREQUENCIES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f[0].toUpperCase() + f.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Rotation order</Label>
            <div className="space-y-1.5 rounded-md border p-2">
              {members.map((m) => {
                const pos = order.indexOf(m.userId);
                return (
                  <label
                    key={m.userId}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={pos !== -1}
                      onChange={() => toggle(m.userId)}
                    />
                    <span className="flex-1">{m.name}</span>
                    {pos !== -1 && (
                      <span className="text-xs text-muted-foreground">
                        #{pos + 1}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating…" : "Create rotation"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
