"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { respondToInvitation } from "@/actions/invitations";
import { Button } from "@/components/ui/button";

export function InvitationActions({
  invitationId,
}: {
  invitationId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);

  async function respond(action: "accept" | "reject") {
    setLoading(action);
    const res = await respondToInvitation({ invitationId, action });
    setLoading(null);
    if (!res.ok) return toast.error(res.error);
    toast.success(action === "accept" ? "Joined workspace" : "Invitation declined");
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        onClick={() => respond("accept")}
        disabled={loading !== null}
      >
        <Check className="h-4 w-4" /> Accept
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => respond("reject")}
        disabled={loading !== null}
      >
        <X className="h-4 w-4" /> Decline
      </Button>
    </div>
  );
}
