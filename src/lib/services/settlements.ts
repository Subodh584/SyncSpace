import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { settlements } from "@/db/schema";

/**
 * Remove every settlement (pending and completed) for a workspace.
 *
 * Settlements are a snapshot derived from the expense set at the moment they
 * were generated. Once expenses change, that snapshot is stale: keeping old
 * "paid" payments around credits them against unrelated new expenses and
 * distorts the next calculation. So any expense mutation clears settlements and
 * the user re-runs "Recalculate" to get a fresh, correct set.
 */
export async function clearWorkspaceSettlements(workspaceId: string) {
  await db
    .delete(settlements)
    .where(eq(settlements.workspaceId, workspaceId));
}

/** True if any settlement in the workspace has been marked paid (completed). */
export async function hasCompletedSettlements(
  workspaceId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: settlements.id })
    .from(settlements)
    .where(
      and(
        eq(settlements.workspaceId, workspaceId),
        eq(settlements.status, "completed"),
      ),
    )
    .limit(1);
  return rows.length > 0;
}
