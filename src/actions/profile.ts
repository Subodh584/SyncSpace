"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { updateProfileSchema } from "@/lib/validations";
import { requireUser } from "@/lib/auth-helpers";
import { type ActionResult, fail, ok } from "@/lib/action";

export async function updateProfile(raw: unknown): Promise<ActionResult> {
  try {
    const me = await requireUser();
    const input = updateProfileSchema.parse(raw);
    await db
      .update(user)
      .set({
        name: input.name ?? undefined,
        image: input.image === "" ? null : input.image ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(user.id, me.id));
    revalidatePath("/settings");
    return ok(null);
  } catch (err) {
    return fail(err);
  }
}
