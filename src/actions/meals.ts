"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  meals,
  mealParticipants,
  mealPolls,
  mealPollOptions,
  mealPollVotes,
} from "@/db/schema";
import { genId } from "@/lib/ids";
import {
  createMealSchema,
  setParticipantChoiceSchema,
  addGuestSchema,
  removeParticipantSchema,
  deleteMealSchema,
  createPollSchema,
  addPollOptionSchema,
  votePollSchema,
  finalizePollSchema,
} from "@/lib/validations";
import { requireMember, AuthError } from "@/lib/auth-helpers";
import { logActivity, notifyMany } from "@/lib/services/activity";
import { getMemberIds } from "@/lib/services/members";
import { MEAL_TYPE_LABELS } from "@/lib/constants";
import { type ActionResult, fail, ok } from "@/lib/action";

const foodPath = (workspaceId: string) => `/workspaces/${workspaceId}/food`;

/** Resolve the workspace + caller membership for a meal, or throw. */
async function loadMealContext(mealId: string) {
  const rows = await db.select().from(meals).where(eq(meals.id, mealId)).limit(1);
  if (!rows[0]) throw new AuthError("Meal not found", 404);
  const { user: me, membership } = await requireMember(rows[0].workspaceId);
  return { meal: rows[0], me, membership };
}

function ensureCreatorOrOwner(
  meal: { createdBy: string | null },
  me: { id: string },
  membership: { role: string },
) {
  if (meal.createdBy !== me.id && membership.role !== "owner") {
    throw new AuthError("Only the meal creator or workspace owner can do this", 403);
  }
}

export async function createMeal(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const input = createMealSchema.parse(raw);
    const { user: me } = await requireMember(input.workspaceId);

    const id = genId();
    await db.insert(meals).values({
      id,
      workspaceId: input.workspaceId,
      type: input.type,
      date: input.date ?? new Date(),
      status: "open",
      createdBy: me.id,
    });

    // Seed a participant row (defaulting to "not eating") for each selected member.
    if (input.memberIds.length > 0) {
      await db.insert(mealParticipants).values(
        input.memberIds.map((userId) => ({
          id: genId(),
          mealId: id,
          userId,
          choice: "none" as const,
          rotiCount: 0,
        })),
      );
    }

    // Every meal starts with a sabzi poll ready for options + votes.
    await db.insert(mealPolls).values({
      id: genId(),
      mealId: id,
      category: "sabzi",
      title: "Which sabzi to make?",
      status: "open",
      createdBy: me.id,
    });

    await logActivity({
      workspaceId: input.workspaceId,
      actorId: me.id,
      type: "meal_planned",
      message: `${me.name} planned ${MEAL_TYPE_LABELS[input.type]}`,
      metadata: { mealId: id },
    });
    const members = await getMemberIds(input.workspaceId);
    await notifyMany(
      members,
      {
        workspaceId: input.workspaceId,
        type: "meal_planned",
        title: `${MEAL_TYPE_LABELS[input.type]} planned`,
        body: "Set how many rotis you'll eat and vote on the sabzi.",
        link: `/workspaces/${input.workspaceId}/food/${id}`,
      },
      me.id,
    );

    revalidatePath(foodPath(input.workspaceId));
    return ok({ id });
  } catch (err) {
    return fail(err);
  }
}

export async function setParticipantChoice(raw: unknown): Promise<ActionResult> {
  try {
    const input = setParticipantChoiceSchema.parse(raw);
    const rows = await db
      .select()
      .from(mealParticipants)
      .where(eq(mealParticipants.id, input.participantId))
      .limit(1);
    if (!rows[0]) throw new AuthError("Participant not found", 404);
    const { meal } = await loadMealContext(rows[0].mealId);

    // Roti count only matters for roti / both.
    const rotiCount =
      input.choice === "roti" || input.choice === "both" ? input.rotiCount : 0;

    await db
      .update(mealParticipants)
      .set({ choice: input.choice, rotiCount, updatedAt: new Date() })
      .where(eq(mealParticipants.id, input.participantId));

    revalidatePath(`${foodPath(meal.workspaceId)}/${meal.id}`);
    return ok(null);
  } catch (err) {
    return fail(err);
  }
}

export async function addGuest(raw: unknown): Promise<ActionResult> {
  try {
    const input = addGuestSchema.parse(raw);
    const { meal } = await loadMealContext(input.mealId);
    const rotiCount =
      input.choice === "roti" || input.choice === "both" ? input.rotiCount : 0;

    await db.insert(mealParticipants).values({
      id: genId(),
      mealId: input.mealId,
      userId: null,
      guestName: input.guestName,
      choice: input.choice,
      rotiCount,
    });

    revalidatePath(`${foodPath(meal.workspaceId)}/${meal.id}`);
    return ok(null);
  } catch (err) {
    return fail(err);
  }
}

export async function removeParticipant(raw: unknown): Promise<ActionResult> {
  try {
    const input = removeParticipantSchema.parse(raw);
    const rows = await db
      .select()
      .from(mealParticipants)
      .where(eq(mealParticipants.id, input.participantId))
      .limit(1);
    if (!rows[0]) throw new AuthError("Participant not found", 404);
    const { meal } = await loadMealContext(rows[0].mealId);

    await db
      .delete(mealParticipants)
      .where(eq(mealParticipants.id, input.participantId));

    revalidatePath(`${foodPath(meal.workspaceId)}/${meal.id}`);
    return ok(null);
  } catch (err) {
    return fail(err);
  }
}

export async function deleteMeal(raw: unknown): Promise<ActionResult> {
  try {
    const input = deleteMealSchema.parse(raw);
    const { meal, me, membership } = await loadMealContext(input.mealId);
    ensureCreatorOrOwner(meal, me, membership);

    await db.delete(meals).where(eq(meals.id, meal.id));
    revalidatePath(foodPath(meal.workspaceId));
    return ok(null);
  } catch (err) {
    return fail(err);
  }
}

export async function createPoll(raw: unknown): Promise<ActionResult> {
  try {
    const input = createPollSchema.parse(raw);
    const { meal, me } = await loadMealContext(input.mealId);

    const pollId = genId();
    await db.insert(mealPolls).values({
      id: pollId,
      mealId: input.mealId,
      category: input.category,
      title: input.title,
      status: "open",
      createdBy: me.id,
    });
    await db.insert(mealPollOptions).values(
      input.options.map((label) => ({
        id: genId(),
        pollId,
        label,
        createdBy: me.id,
      })),
    );

    revalidatePath(`${foodPath(meal.workspaceId)}/${meal.id}`);
    return ok(null);
  } catch (err) {
    return fail(err);
  }
}

export async function addPollOption(raw: unknown): Promise<ActionResult> {
  try {
    const input = addPollOptionSchema.parse(raw);
    const pollRows = await db
      .select()
      .from(mealPolls)
      .where(eq(mealPolls.id, input.pollId))
      .limit(1);
    if (!pollRows[0]) throw new AuthError("Poll not found", 404);
    const { meal, me } = await loadMealContext(pollRows[0].mealId);
    if (pollRows[0].status === "closed")
      throw new AuthError("This poll is closed", 400);

    await db.insert(mealPollOptions).values({
      id: genId(),
      pollId: input.pollId,
      label: input.label,
      createdBy: me.id,
    });

    revalidatePath(`${foodPath(meal.workspaceId)}/${meal.id}`);
    return ok(null);
  } catch (err) {
    return fail(err);
  }
}

export async function votePoll(raw: unknown): Promise<ActionResult> {
  try {
    const input = votePollSchema.parse(raw);
    const pollRows = await db
      .select()
      .from(mealPolls)
      .where(eq(mealPolls.id, input.pollId))
      .limit(1);
    if (!pollRows[0]) throw new AuthError("Poll not found", 404);
    if (pollRows[0].status === "closed")
      throw new AuthError("This poll is closed", 400);
    const { meal, me } = await loadMealContext(pollRows[0].mealId);

    // One vote per user per poll — replace any existing vote.
    await db
      .delete(mealPollVotes)
      .where(
        and(
          eq(mealPollVotes.pollId, input.pollId),
          eq(mealPollVotes.userId, me.id),
        ),
      );
    await db.insert(mealPollVotes).values({
      id: genId(),
      pollId: input.pollId,
      optionId: input.optionId,
      userId: me.id,
    });

    revalidatePath(`${foodPath(meal.workspaceId)}/${meal.id}`);
    return ok(null);
  } catch (err) {
    return fail(err);
  }
}

export async function finalizePoll(raw: unknown): Promise<ActionResult> {
  try {
    const input = finalizePollSchema.parse(raw);
    const pollRows = await db
      .select()
      .from(mealPolls)
      .where(eq(mealPolls.id, input.pollId))
      .limit(1);
    if (!pollRows[0]) throw new AuthError("Poll not found", 404);
    const { meal, me, membership } = await loadMealContext(pollRows[0].mealId);
    ensureCreatorOrOwner(meal, me, membership);

    await db
      .update(mealPolls)
      .set({
        winningOptionId: input.optionId,
        status: "closed",
        updatedAt: new Date(),
      })
      .where(eq(mealPolls.id, input.pollId));

    revalidatePath(`${foodPath(meal.workspaceId)}/${meal.id}`);
    revalidatePath(foodPath(meal.workspaceId));
    return ok(null);
  } catch (err) {
    return fail(err);
  }
}

/** Re-open a finalized poll (creator/owner) to allow more voting. */
export async function reopenPoll(raw: unknown): Promise<ActionResult> {
  try {
    const input = finalizePollSchema.pick({ pollId: true }).parse(raw);
    const pollRows = await db
      .select()
      .from(mealPolls)
      .where(eq(mealPolls.id, input.pollId))
      .limit(1);
    if (!pollRows[0]) throw new AuthError("Poll not found", 404);
    const { meal, me, membership } = await loadMealContext(pollRows[0].mealId);
    ensureCreatorOrOwner(meal, me, membership);

    await db
      .update(mealPolls)
      .set({ winningOptionId: null, status: "open", updatedAt: new Date() })
      .where(eq(mealPolls.id, input.pollId));

    revalidatePath(`${foodPath(meal.workspaceId)}/${meal.id}`);
    revalidatePath(foodPath(meal.workspaceId));
    return ok(null);
  } catch (err) {
    return fail(err);
  }
}
