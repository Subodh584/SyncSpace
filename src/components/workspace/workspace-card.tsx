"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users, Crown, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface WorkspaceCardData {
  id: string;
  name: string;
  description: string | null;
  role: "owner" | "member";
  memberCount: number;
}

/** Clickable workspace card that shows a loader while the workspace loads. */
export function WorkspaceCard({ workspace }: { workspace: WorkspaceCardData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function open() {
    startTransition(() => router.push(`/workspaces/${workspace.id}`));
  }

  return (
    <button type="button" onClick={open} className="text-left">
      <Card
        className={cn(
          "relative h-full transition-shadow hover:shadow-md",
          isPending && "opacity-70",
        )}
      >
        {isPending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/50">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="line-clamp-1">{workspace.name}</CardTitle>
            {workspace.role === "owner" && (
              <Badge variant="secondary" className="gap-1">
                <Crown className="h-3 w-3" /> Owner
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
            {workspace.description || "No description"}
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {workspace.memberCount} member
            {workspace.memberCount === 1 ? "" : "s"}
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
