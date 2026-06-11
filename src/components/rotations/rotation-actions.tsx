"use client";

import { useRouter } from "next/navigation";
import { SkipForward, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { advanceRotation, deleteRotation } from "@/actions/rotations";
import { Button } from "@/components/ui/button";

export function RotationActions({ rotationId }: { rotationId: string }) {
  const router = useRouter();

  async function advance() {
    const res = await advanceRotation(rotationId);
    if (!res.ok) return toast.error(res.error);
    toast.success("Rotation advanced");
    router.refresh();
  }

  async function remove() {
    if (!confirm("Delete this rotation?")) return;
    const res = await deleteRotation(rotationId);
    if (!res.ok) return toast.error(res.error);
    toast.success("Rotation deleted");
    router.refresh();
  }

  return (
    <div className="flex gap-1">
      <Button size="sm" variant="outline" onClick={advance}>
        <SkipForward className="h-4 w-4" /> Advance
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-destructive"
        onClick={remove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
