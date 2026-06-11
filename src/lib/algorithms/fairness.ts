/**
 * Fairness scoring.
 *
 * Produces a 0-100 score per member and for the whole workspace. The score
 * blends two dimensions:
 *
 *   • Task fairness   — does this member carry their share of the difficulty
 *                       weighted task load?
 *   • Expense fairness — has this member contributed (paid) their share of
 *                       expenses relative to what they consume (owe)?
 *
 * A member doing exactly their fair share scores 100. Doing far more or far
 * less drags the score down symmetrically (over-contributing is "unfair" to
 * them; under-contributing is "unfair" to others).
 */
import { round2 } from "@/lib/utils";

export interface FairnessMemberInput {
  userId: string;
  taskWeightLoad: number; // sum of difficulty weights assigned/completed
  totalPaid: number;
  totalOwed: number;
}

export interface FairnessMemberScore {
  userId: string;
  taskScore: number;
  expenseScore: number;
  overall: number;
}

const TASK_WEIGHT = 0.5;
const EXPENSE_WEIGHT = 0.5;

/**
 * Map a ratio (actual / fair) onto 0-100 where 1.0 => 100 and deviation in
 * either direction reduces the score. ratio 0 or 2 => 0.
 */
function ratioToScore(actual: number, fair: number): number {
  if (fair <= 0) return 100; // nothing expected → no unfairness possible
  const ratio = actual / fair;
  const score = 100 * (1 - Math.min(Math.abs(ratio - 1), 1));
  return round2(score);
}

export function computeFairness(members: FairnessMemberInput[]): {
  members: FairnessMemberScore[];
  workspaceScore: number;
} {
  const n = members.length;
  if (n === 0) return { members: [], workspaceScore: 100 };

  const totalTaskWeight = members.reduce((s, m) => s + m.taskWeightLoad, 0);
  const totalPaid = members.reduce((s, m) => s + m.totalPaid, 0);

  const fairTask = totalTaskWeight / n;
  const fairPaid = totalPaid / n;

  const scored = members.map((m) => {
    const taskScore = ratioToScore(m.taskWeightLoad, fairTask);
    // Expense fairness measures contribution (paid) against the average paid.
    const expenseScore = ratioToScore(m.totalPaid, fairPaid);
    const overall = round2(
      taskScore * TASK_WEIGHT + expenseScore * EXPENSE_WEIGHT,
    );
    return { userId: m.userId, taskScore, expenseScore, overall };
  });

  const workspaceScore = round2(
    scored.reduce((s, m) => s + m.overall, 0) / n,
  );

  return { members: scored, workspaceScore };
}

export function fairnessLabel(score: number): {
  label: string;
  tone: "good" | "ok" | "bad";
} {
  if (score >= 80) return { label: "Balanced", tone: "good" };
  if (score >= 55) return { label: "Slightly uneven", tone: "ok" };
  return { label: "Unbalanced", tone: "bad" };
}
