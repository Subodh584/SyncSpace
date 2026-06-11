"use client";

import { useRouter } from "next/navigation";
import { MoreVertical, Crown, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { removeMember, transferOwnership } from "@/actions/workspaces";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MemberActions({
  workspaceId,
  targetUserId,
  targetName,
}: {
  workspaceId: string;
  targetUserId: string;
  targetName: string;
}) {
  const router = useRouter();

  async function onTransfer() {
    if (!confirm(`Transfer ownership to ${targetName}? You will become a member.`))
      return;
    const res = await transferOwnership(workspaceId, targetUserId);
    if (!res.ok) return toast.error(res.error);
    toast.success(`Ownership transferred to ${targetName}`);
    router.refresh();
  }

  async function onRemove() {
    if (!confirm(`Remove ${targetName} from this workspace?`)) return;
    const res = await removeMember(workspaceId, targetUserId);
    if (!res.ok) return toast.error(res.error);
    toast.success(`${targetName} removed`);
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onTransfer}>
          <Crown className="h-4 w-4" /> Make owner
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onRemove} className="text-destructive">
          <UserMinus className="h-4 w-4" /> Remove member
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
