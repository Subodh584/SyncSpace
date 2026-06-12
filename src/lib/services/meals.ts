import { eq, desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  meals,
  mealParticipants,
  mealPolls,
  mealPollOptions,
  mealPollVotes,
  user,
} from "@/db/schema";

export interface ParticipantView {
  id: string;
  userId: string | null;
  name: string; // member name or guest name
  image: string | null;
  isGuest: boolean;
  choice: "roti" | "rice" | "both" | "none";
  rotiCount: number;
}

export interface CookingSummary {
  totalRotis: number;
  riceEaters: number; // people having rice (rice or both)
  bothEaters: number;
  skipping: number;
  eatingCount: number; // anyone not "none"
  guestCount: number;
  total: number;
}

/** Aggregate per-person choices into what the cook needs to prepare. */
export function computeCookingSummary(
  participants: { choice: ParticipantView["choice"]; rotiCount: number; isGuest: boolean }[],
): CookingSummary {
  let totalRotis = 0;
  let riceEaters = 0;
  let bothEaters = 0;
  let skipping = 0;
  let eatingCount = 0;
  let guestCount = 0;
  for (const p of participants) {
    if (p.isGuest) guestCount++;
    if (p.choice === "none") {
      skipping++;
      continue;
    }
    eatingCount++;
    if (p.choice === "roti" || p.choice === "both") totalRotis += p.rotiCount;
    if (p.choice === "rice" || p.choice === "both") riceEaters++;
    if (p.choice === "both") bothEaters++;
  }
  return {
    totalRotis,
    riceEaters,
    bothEaters,
    skipping,
    eatingCount,
    guestCount,
    total: participants.length,
  };
}

export interface PollOptionView {
  id: string;
  label: string;
  votes: number;
  voters: string[]; // userIds who voted for this option
}

export interface PollView {
  id: string;
  category: "sabzi" | "grain" | "other";
  title: string;
  status: "open" | "closed";
  winningOptionId: string | null;
  options: PollOptionView[];
  myOptionId: string | null; // the viewer's current vote, if any
}

/** Join participants to user names; guests use guestName. */
async function getParticipants(mealId: string): Promise<ParticipantView[]> {
  const rows = await db
    .select({
      id: mealParticipants.id,
      userId: mealParticipants.userId,
      guestName: mealParticipants.guestName,
      choice: mealParticipants.choice,
      rotiCount: mealParticipants.rotiCount,
      name: user.name,
      image: user.image,
      createdAt: mealParticipants.createdAt,
    })
    .from(mealParticipants)
    .leftJoin(user, eq(mealParticipants.userId, user.id))
    .where(eq(mealParticipants.mealId, mealId))
    .orderBy(mealParticipants.createdAt);

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    name: r.userId ? (r.name ?? "Unknown") : (r.guestName ?? "Guest"),
    image: r.userId ? r.image : null,
    isGuest: !r.userId,
    choice: r.choice,
    rotiCount: r.rotiCount,
  }));
}

/** Polls for a meal with vote tallies and the viewer's own vote. */
async function getPolls(
  mealId: string,
  viewerId: string,
): Promise<PollView[]> {
  const polls = await db
    .select()
    .from(mealPolls)
    .where(eq(mealPolls.mealId, mealId))
    .orderBy(mealPolls.createdAt);
  if (polls.length === 0) return [];

  const pollIds = polls.map((p) => p.id);
  const options = await db
    .select()
    .from(mealPollOptions)
    .where(inArray(mealPollOptions.pollId, pollIds))
    .orderBy(mealPollOptions.createdAt);
  const votes = await db
    .select()
    .from(mealPollVotes)
    .where(inArray(mealPollVotes.pollId, pollIds));

  return polls.map((p) => {
    const myVote = votes.find(
      (v) => v.pollId === p.id && v.userId === viewerId,
    );
    return {
      id: p.id,
      category: p.category,
      title: p.title,
      status: p.status,
      winningOptionId: p.winningOptionId,
      myOptionId: myVote?.optionId ?? null,
      options: options
        .filter((o) => o.pollId === p.id)
        .map((o) => {
          const optVotes = votes.filter((v) => v.optionId === o.id);
          return {
            id: o.id,
            label: o.label,
            votes: optVotes.length,
            voters: optVotes.map((v) => v.userId),
          };
        }),
    };
  });
}

export interface MealDetail {
  meal: typeof meals.$inferSelect;
  participants: ParticipantView[];
  polls: PollView[];
  summary: CookingSummary;
}

export async function getMealDetail(
  mealId: string,
  viewerId: string,
): Promise<MealDetail | null> {
  const rows = await db
    .select()
    .from(meals)
    .where(eq(meals.id, mealId))
    .limit(1);
  if (!rows[0]) return null;
  const [participants, polls] = await Promise.all([
    getParticipants(mealId),
    getPolls(mealId, viewerId),
  ]);
  return {
    meal: rows[0],
    participants,
    polls,
    summary: computeCookingSummary(participants),
  };
}

export interface MealListItem {
  id: string;
  type: "breakfast" | "lunch" | "dinner";
  date: Date;
  status: "open" | "closed";
  isNext: boolean; // the soonest upcoming meal (today or later)
  summary: CookingSummary;
  sabzi: string | null; // winning sabzi label, if finalized
}

/** Meals for a workspace with a lightweight cooking summary per meal. */
export async function listMeals(workspaceId: string): Promise<MealListItem[]> {
  const rows = await db
    .select()
    .from(meals)
    .where(eq(meals.workspaceId, workspaceId))
    .orderBy(desc(meals.date), desc(meals.createdAt));
  if (rows.length === 0) return [];

  const mealIds = rows.map((m) => m.id);
  const parts = await db
    .select({
      mealId: mealParticipants.mealId,
      choice: mealParticipants.choice,
      rotiCount: mealParticipants.rotiCount,
      userId: mealParticipants.userId,
    })
    .from(mealParticipants)
    .where(inArray(mealParticipants.mealId, mealIds));

  // Resolve the chosen sabzi (winning option of a finalized sabzi poll).
  const sabziPolls = await db
    .select()
    .from(mealPolls)
    .where(inArray(mealPolls.mealId, mealIds));
  const winningOptionIds = sabziPolls
    .filter((p) => p.category === "sabzi" && p.winningOptionId)
    .map((p) => p.winningOptionId as string);
  const winningOptions = winningOptionIds.length
    ? await db
        .select()
        .from(mealPollOptions)
        .where(inArray(mealPollOptions.id, winningOptionIds))
    : [];

  // The "next meal" is the soonest one dated today or later.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const upcoming = rows
    .filter((m) => m.date.getTime() >= startOfToday.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const nextMealId = upcoming[0]?.id ?? null;

  return rows.map((m) => {
    const mealParts = parts
      .filter((p) => p.mealId === m.id)
      .map((p) => ({ choice: p.choice, rotiCount: p.rotiCount, isGuest: !p.userId }));
    const sabziPoll = sabziPolls.find(
      (p) => p.mealId === m.id && p.category === "sabzi" && p.winningOptionId,
    );
    const sabzi = sabziPoll
      ? (winningOptions.find((o) => o.id === sabziPoll.winningOptionId)?.label ??
        null)
      : null;
    return {
      id: m.id,
      type: m.type,
      date: m.date,
      status: m.status,
      isNext: m.id === nextMealId,
      summary: computeCookingSummary(mealParts),
      sabzi,
    };
  });
}
