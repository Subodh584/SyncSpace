"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Copy } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/utils";
import { inviteByUserId } from "@/actions/invitations";
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

export function InviteMember({
  workspaceId,
  joinCode,
}: {
  workspaceId: string;
  joinCode: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    const res = await inviteByUserId({
      workspaceId,
      workspaceUserId: form.get("workspaceUserId"),
    });
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Invitation sent");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4" /> Invite member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a member</DialogTitle>
          <DialogDescription>
            Invite by their workspace user ID, or share the join code.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workspaceUserId">Workspace user ID</Label>
            <Input
              id="workspaceUserId"
              name="workspaceUserId"
              placeholder="e.g. rahul_5678"
              required
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending…" : "Send invitation"}
          </Button>
        </form>
        <div className="mt-2 rounded-lg border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Or share this code:</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 rounded bg-background px-2 py-1 font-mono text-sm">
              {joinCode}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={async () => {
                const ok = await copyToClipboard(joinCode);
                if (ok) toast.success("Join code copied");
                else toast.error("Could not copy");
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
