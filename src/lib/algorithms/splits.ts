/**
 * Expense split calculation. Converts a chosen split method plus per-member
 * inputs into concrete owed amounts that sum (within rounding) to the total.
 */
import { round2 } from "@/lib/utils";

export type SplitMethod = "equal" | "percentage" | "fixed" | "custom";

export interface SplitInputMember {
  userId: string;
  /** For "percentage": 0-100. For "fixed"/"custom": absolute amount. */
  value?: number;
  /** For "custom": whether this member participates in an equal share. */
  included?: boolean;
}

export interface SplitResult {
  userId: string;
  amount: number;
  percentage?: number;
}

export function calculateSplits(
  method: SplitMethod,
  total: number,
  members: SplitInputMember[],
): SplitResult[] {
  switch (method) {
    case "equal":
      return equalSplit(total, members);
    case "custom":
      return equalSplit(
        total,
        members.filter((m) => m.included !== false),
      );
    case "percentage":
      return percentageSplit(total, members);
    case "fixed":
      return fixedSplit(members);
    default:
      return equalSplit(total, members);
  }
}

/** Split equally, pushing the rounding remainder onto the first member. */
function equalSplit(total: number, members: SplitInputMember[]): SplitResult[] {
  if (members.length === 0) return [];
  const share = round2(total / members.length);
  const results = members.map((m) => ({ userId: m.userId, amount: share }));
  const drift = round2(total - share * members.length);
  if (drift !== 0) results[0].amount = round2(results[0].amount + drift);
  return results;
}

function percentageSplit(
  total: number,
  members: SplitInputMember[],
): SplitResult[] {
  return members.map((m) => {
    const pct = m.value ?? 0;
    return {
      userId: m.userId,
      amount: round2((total * pct) / 100),
      percentage: pct,
    };
  });
}

function fixedSplit(members: SplitInputMember[]): SplitResult[] {
  return members.map((m) => ({
    userId: m.userId,
    amount: round2(m.value ?? 0),
  }));
}

/** Validate that the splits reconcile to the total (within 1 paisa). */
export function validateSplits(
  total: number,
  splits: SplitResult[],
): { valid: boolean; sum: number } {
  const sum = round2(splits.reduce((acc, s) => acc + s.amount, 0));
  return { valid: Math.abs(sum - total) <= 0.01, sum };
}
