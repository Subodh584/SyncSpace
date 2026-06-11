"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Check } from "lucide-react";
import { toast } from "sonner";
import {
  generateSettlements,
  markSettlementPaid,
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

export function MarkPaid({ settlementId }: { settlementId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
      <Check className="h-4 w-4" /> Mark paid
    </Button>
  );
}
