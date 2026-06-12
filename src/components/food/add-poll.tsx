"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { createPoll } from "@/actions/meals";
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
import { POLL_CATEGORIES, POLL_CATEGORY_LABELS } from "@/lib/constants";

const PRESETS: Record<string, { title: string; options: string[] }> = {
  grain: { title: "Roti or rice tonight?", options: ["Roti", "Rice", "Both"] },
  sabzi: { title: "Which sabzi to make?", options: ["", ""] },
  other: { title: "", options: ["", ""] },
};

export function AddPoll({ mealId }: { mealId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("grain");
  const [title, setTitle] = useState(PRESETS.grain.title);
  const [options, setOptions] = useState<string[]>(PRESETS.grain.options);

  function applyPreset(cat: string) {
    setCategory(cat);
    const preset = PRESETS[cat] ?? PRESETS.other;
    setTitle(preset.title);
    setOptions([...preset.options]);
  }

  function setOption(i: number, v: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? v : o)));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleaned = options.map((o) => o.trim()).filter(Boolean);
    if (cleaned.length < 2) return toast.error("Add at least two options");
    setLoading(true);
    const res = await createPoll({ mealId, category, title, options: cleaned });
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Poll added");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <ListChecks className="h-4 w-4" /> Add poll
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a poll</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={category} onValueChange={applyPreset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POLL_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {POLL_CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="poll-title">Question</Label>
            <Input
              id="poll-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Which sabzi to make?"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Options</Label>
            <div className="space-y-2">
              {options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={o}
                    onChange={(e) => setOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                  />
                  {options.length > 2 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9"
                      onClick={() =>
                        setOptions((prev) => prev.filter((_, idx) => idx !== i))
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setOptions((prev) => [...prev, ""])}
            >
              <Plus className="h-4 w-4" /> Add option
            </Button>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Adding…" : "Add poll"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
