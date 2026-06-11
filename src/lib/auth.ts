import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

/**
 * Build a unique, human-friendly searchable workspace ID, e.g. `subodh_1234`.
 * The DB unique constraint on `workspace_user_id` is the final guard against
 * the (rare) random collision.
 */
function buildWorkspaceUserId(seed: string): string {
  const base =
    seed
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 16) || "user";
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base}_${suffix}`;
}

export const auth = betterAuth({
  appName: "SyncSpace",
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    autoSignIn: true,
    // No transactional email provider is wired up by default. In development
    // the reset link is logged to the server console; swap this for Resend,
    // Postmark, etc. in production.
    sendResetPassword: async ({ user, url }) => {
      console.log(`\n🔑 Password reset for ${user.email}:\n${url}\n`);
    },
  },
  user: {
    additionalFields: {
      username: { type: "string", required: true, input: true },
      workspaceUserId: { type: "string", required: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (userData: Record<string, unknown>) => {
          const seed =
            (userData.username as string) ||
            (userData.email as string)?.split("@")[0] ||
            "user";
          return {
            data: {
              ...userData,
              workspaceUserId: buildWorkspaceUserId(seed),
            },
          };
        },
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh daily
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
