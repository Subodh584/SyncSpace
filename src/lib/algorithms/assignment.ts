/**
 * Automatic task-assignment algorithms.
 *
 * Each strategy takes the set of unassigned tasks plus the current workload of
 * each member and returns a mapping of taskId -> memberId. They are pure
 * functions so they can be unit-tested and reused on both server and client.
 */

export type AssignmentStrategy =
  | "round_robin"
  | "random"
  | "equal"
  | "weighted";

export interface AssignableTask {
  id: string;
  /** 1 = easy, 2 = medium, 3 = hard. Drives weighted distribution. */
  difficultyWeight: number;
}

export interface MemberLoad {
  userId: string;
  /** Number of tasks already assigned (for equal distribution). */
  taskCount: number;
  /** Sum of difficulty weights already assigned (for weighted distribution). */
  weightLoad: number;
}

export type Assignment = Record<string, string>; // taskId -> userId

function emptyIfNoMembers(members: MemberLoad[]): boolean {
  return members.length === 0;
}

/** Deterministic sequential distribution: t0→m0, t1→m1, t2→m2, t0→m0 … */
export function roundRobin(
  tasks: AssignableTask[],
  members: MemberLoad[],
): Assignment {
  const result: Assignment = {};
  if (emptyIfNoMembers(members)) return result;
  tasks.forEach((task, i) => {
    result[task.id] = members[i % members.length].userId;
  });
  return result;
}

/** Uniformly random distribution. */
export function random(
  tasks: AssignableTask[],
  members: MemberLoad[],
): Assignment {
  const result: Assignment = {};
  if (emptyIfNoMembers(members)) return result;
  for (const task of tasks) {
    const m = members[Math.floor(Math.random() * members.length)];
    result[task.id] = m.userId;
  }
  return result;
}

/**
 * Equal distribution: always hand the next task to whoever currently has the
 * fewest tasks, so counts stay within 1 of each other.
 */
export function equalDistribution(
  tasks: AssignableTask[],
  members: MemberLoad[],
): Assignment {
  const result: Assignment = {};
  if (emptyIfNoMembers(members)) return result;
  const load = new Map(members.map((m) => [m.userId, m.taskCount]));
  for (const task of tasks) {
    let best = members[0].userId;
    let bestLoad = Infinity;
    for (const m of members) {
      const l = load.get(m.userId)!;
      if (l < bestLoad) {
        bestLoad = l;
        best = m.userId;
      }
    }
    result[task.id] = best;
    load.set(best, bestLoad + 1);
  }
  return result;
}

/**
 * Weighted distribution: balance total difficulty load rather than task count.
 * Hard tasks are assigned first (greedy worst-fit) so they can be balanced by
 * cheaper tasks afterwards.
 */
export function weightedDistribution(
  tasks: AssignableTask[],
  members: MemberLoad[],
): Assignment {
  const result: Assignment = {};
  if (emptyIfNoMembers(members)) return result;
  const load = new Map(members.map((m) => [m.userId, m.weightLoad]));
  const ordered = [...tasks].sort(
    (a, b) => b.difficultyWeight - a.difficultyWeight,
  );
  for (const task of ordered) {
    let best = members[0].userId;
    let bestLoad = Infinity;
    for (const m of members) {
      const l = load.get(m.userId)!;
      if (l < bestLoad) {
        bestLoad = l;
        best = m.userId;
      }
    }
    result[task.id] = best;
    load.set(best, bestLoad + (task.difficultyWeight || 1));
  }
  return result;
}

export function assignTasks(
  strategy: AssignmentStrategy,
  tasks: AssignableTask[],
  members: MemberLoad[],
): Assignment {
  switch (strategy) {
    case "round_robin":
      return roundRobin(tasks, members);
    case "random":
      return random(tasks, members);
    case "equal":
      return equalDistribution(tasks, members);
    case "weighted":
      return weightedDistribution(tasks, members);
    default:
      return roundRobin(tasks, members);
  }
}
