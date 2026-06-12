"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Check, Clock, Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import {
  generateSettlements,
  markSettlementPaid,
  markSettlementUnpaid,
} from "@/actions/settlements";
import { Button } from "@/components/ui/button";

export function GenerateSettlements({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function run() {
    setLoading(true);
    const res = await generateSettlements(workspaceId);
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(`Generated ${res.data.count} optimised settlement(s)`);
    router.refresh();
  }
  return (
    <Button onClick={run} disabled={loading}>
      <RefreshCw className="h-4 w-4" />
      {loading ? "Calculating…" : "Recalculate settlements"}
    </Button>
  );
}

export function MarkPaid({
  settlementId,
  isReceiver,
}: {
  settlementId: string;
  /** Only the person receiving the money can confirm the payment. */
  isReceiver: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // The sender (and any other member) can't confirm — they await the
  // receiver's confirmation, so the control is locked.
  if (!isReceiver) {
    return (
      <Button size="sm" variant="outline" disabled>
        <Clock className="h-4 w-4" /> Awaiting
      </Button>
    );
  }

  async function run() {
    setLoading(true);
    const res = await markSettlementPaid({ settlementId });
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Marked as paid");
    router.refresh();
  }
  return (
    <Button size="sm" variant="outline" onClick={run} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Check className="h-4 w-4" />
      )}
      Mark paid
    </Button>
  );
}

export function MarkUnpaid({
  settlementId,
  isReceiver,
}: {
  settlementId: string;
  /** Only the receiver who confirmed the payment can revert it. */
  isReceiver: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Others just see the "Paid" badge; only the receiver gets the undo control.
  if (!isReceiver) return null;

  async function run() {
    setLoading(true);
    const res = await markSettlementUnpaid({ settlementId });
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Marked as unpaid");
    router.refresh();
  }
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 px-2 text-xs text-muted-foreground"
      onClick={run}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Undo2 className="h-3.5 w-3.5" />
      )}
      Mark unpaid
    </Button>
  );
}
