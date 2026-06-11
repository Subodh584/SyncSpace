/**
 * Rotation helpers for recurring responsibilities (cleaning, cooking, …).
 */

export type Frequency = "daily" | "weekly" | "monthly";

/** Index of the next assignee given the current one in an ordered member list. */
export function nextIndex(order: string[], currentId: string | null): number {
  if (order.length === 0) return -1;
  if (!currentId) return 0;
  const idx = order.indexOf(currentId);
  if (idx === -1) return 0;
  return (idx + 1) % order.length;
}

export function nextAssignee(
  order: string[],
  currentId: string | null,
): string | null {
  const idx = nextIndex(order, currentId);
  return idx === -1 ? null : order[idx];
}

/** The assignee two steps ahead — used to display "next up". */
export function upcomingAssignee(
  order: string[],
  currentId: string | null,
): string | null {
  const next = nextAssignee(order, currentId);
  return nextAssignee(order, next);
}

export function addInterval(from: Date, frequency: Frequency): Date {
  const d = new Date(from);
  switch (frequency) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
  }
  return d;
}

export function isDue(nextRotationAt: Date | null): boolean {
  if (!nextRotationAt) return false;
  return nextRotationAt.getTime() <= Date.now();
}
