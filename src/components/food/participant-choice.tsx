"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { setParticipantChoice, removeParticipant } from "@/actions/meals";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { initials } from "@/lib/utils";
import type { ParticipantView } from "@/lib/services/meals";

type Choice = ParticipantView["choice"];

export function ParticipantChoice({ p }: { p: ParticipantView }) {
  const router = useRouter();
  const [choice, setChoice] = useState<Choice>(p.choice);
  const [rotiCount, setRotiCount] = useState(String(p.rotiCount));
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const needsRotis = choice === "roti" || choice === "both";

  async function save(nextChoice: Choice, nextRoti: string) {
    setSaving(true);
    const res = await setParticipantChoice({
      participantId: p.id,
      choice: nextChoice,
      rotiCount: Number(nextRoti) || 0,
    });
    setSaving(false);
    if (!res.ok) return toast.error(res.error);
    router.refresh();
  }

  function onChoiceChange(v: string) {
    const next = v as Choice;
    setChoice(next);
    void save(next, rotiCount);
  }

  async function remove() {
    setRemoving(true);
    const res = await removeParticipant({ participantId: p.id });
    setRemoving(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Removed");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-8 w-8">
        {p.image && <AvatarImage src={p.image} />}
        <AvatarFallback className="text-xs">{initials(p.name)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="truncate text-sm font-medium">{p.name}</span>
        {p.isGuest && (
          <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px]">
            Guest
          </Badge>
        )}
      </div>

      {needsRotis && (
        <Input
          type="number"
          min={0}
          max={99}
          className="h-8 w-16"
          value={rotiCount}
          onChange={(e) => setRotiCount(e.target.value)}
          onBlur={() => save(choice, rotiCount)}
          title="Number of rotis"
        />
      )}

      <Select value={choice} onValueChange={onChoiceChange}>
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

      {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}

      {p.isGuest && (
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-destructive"
          onClick={remove}
          disabled={removing}
          title="Remove guest"
        >
          {removing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}
