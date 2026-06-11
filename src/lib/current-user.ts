import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { getSession } from "@/lib/auth-helpers";

/** Full DB user for the current session, or redirect to /login. */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  const rows = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1);
  if (!rows[0]) redirect("/login");
  return rows[0];
}
