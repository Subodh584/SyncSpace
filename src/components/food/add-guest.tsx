"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { addGuest } from "@/actions/meals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EATING_CHOICES, EATING_CHOICE_LABELS } from "@/lib/constants";

export function AddGuest({ mealId }: { mealId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [choice, setChoice] = useState("roti");
  const [rotiCount, setRotiCount] = useState("2");
  const [loading, setLoading] = useState(false);

  const needsRotis = choice === "roti" || choice === "both";

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Enter a guest name");
    setLoading(true);
    const res = await addGuest({
      mealId,
      guestName: name.trim(),
      choice,
      rotiCount: Number(rotiCount) || 0,
    });
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Guest added");
    setName("");
    setRotiCount("2");
    router.refresh();
  }

  return (
    <form onSubmit={add} className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Guest name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-8 flex-1 min-w-[120px]"
      />
      {needsRotis && (
        <Input
          type="number"
          min={0}
          max={99}
          className="h-8 w-16"
          value={rotiCount}
          onChange={(e) => setRotiCount(e.target.value)}
          title="Number of rotis"
        />
      )}
      <Select value={choice} onValueChange={setChoice}>
        <SelectTrigger className="h-8 w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {EATING_CHOICES.map((c) => (
            <SelectItem key={c} value={c}>
              {EATING_CHOICE_LABELS[c]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" size="sm" variant="outline" disabled={loading}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )}
        Add guest
      </Button>
    </form>
  );
}
