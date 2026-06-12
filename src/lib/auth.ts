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

/**
 * Resolve the auth base URL. Prefers an explicit `BETTER_AUTH_URL`, then falls
 * back to the stable production domain Vercel injects automatically
 * (`VERCEL_PROJECT_PRODUCTION_URL`, host only — no protocol), and finally to
 * localhost for local dev. This avoids hardcoding the deployment URL.
 */
function resolveBaseURL(): string {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}

/**
 * Origins the server will accept auth requests from. The client (see
 * `auth-client.ts`) deliberately uses `window.location.origin`, so the page may
 * be served from `localhost`, `127.0.0.1`, a LAN IP, or a non-3000 port — all
 * of which must be trusted or better-auth rejects them with "invalid origin".
 */
function resolveTrustedOrigins(): string[] {
  const origins = new Set<string>([resolveBaseURL()]);

  for (const env of [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.BETTER_AUTH_URL,
  ]) {
    if (env) origins.add(env);
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    origins.add(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }

  // In development, trust local/LAN origins on any port so the app works when
  // opened via 127.0.0.1, a phone on the same network, etc. Wildcards are
  // supported by better-auth's trustedOrigins matcher.
  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:*");
    origins.add("http://127.0.0.1:*");
    origins.add("http://192.168.*.*:*");
    origins.add("http://10.*.*.*:*");
  }

  return [...origins];
}

export const auth = betterAuth({
  appName: "SyncSpace",
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: resolveBaseURL(),
  trustedOrigins: resolveTrustedOrigins(),
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
    // Don't auto-create a session on signup — the user is sent to the login
    // page to sign in explicitly (see register/page.tsx).
    autoSignIn: false,
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
