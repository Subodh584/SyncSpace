"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ChefHat } from "lucide-react";
import { toast } from "sonner";
import { setCookFrequency } from "@/actions/meals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CookFrequency({
  workspaceId,
  value,
}: {
  workspaceId: string;
  value: number;
}) {
  const router = useRouter();
  const [count, setCount] = useState(String(value));
  const [saving, setSaving] = useState(false);

  async function save() {
    const n = Number(count);
    if (!Number.isFinite(n) || n < 1 || n > 6) {
      setCount(String(value));
      return toast.error("Cook can come 1–6 times a day");
    }
    if (n === value) return;
    setSaving(true);
    const res = await setCookFrequency({ workspaceId, count: n });
    setSaving(false);
    if (!res.ok) {
      setCount(String(value));
      return toast.error(res.error);
    }
    toast.success("Saved");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
      <ChefHat className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">Cook comes</span>
      <Input
        type="number"
        min={1}
        max={6}
        value={count}
        onChange={(e) => setCount(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="h-7 w-14 text-center"
      />
      <span className="text-muted-foreground">times/day</span>
      {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
    </div>
  );
}
