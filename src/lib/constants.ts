export const TASK_STATUSES = ["pending", "in_progress", "completed"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high"] as const;

export const DIFFICULTY_WEIGHTS = {
  easy: 1,
  medium: 2,
  hard: 3,
} as const;

export const EXPENSE_CATEGORIES = [
  "food",
  "travel",
  "rent",
  "utilities",
  "shopping",
  "misc",
] as const;

export const SPLIT_METHODS = [
  "equal",
  "percentage",
  "fixed",
  "custom",
] as const;

export const ASSIGNMENT_STRATEGIES = [
  "round_robin",
  "random",
  "equal",
  "weighted",
] as const;

export const ROTATION_FREQUENCIES = ["daily", "weekly", "monthly"] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  food: "Food",
  travel: "Travel",
  rent: "Rent",
  utilities: "Utilities",
  shopping: "Shopping",
  misc: "Miscellaneous",
};

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

export const STRATEGY_LABELS: Record<string, string> = {
  round_robin: "Round Robin",
  random: "Random",
  equal: "Equal Distribution",
  weighted: "Weighted by Difficulty",
};

export const INVITATION_TTL_DAYS = 7;
