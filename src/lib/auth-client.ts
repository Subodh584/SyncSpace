"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Use the origin the page was actually loaded from so requests are always
  // same-origin (avoids "Failed to fetch" CORS errors when the app is opened
  // via 127.0.0.1, a LAN IP, or a non-3000 port). Falls back to the env value
  // during SSR where `window` is unavailable.
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
          : "http://localhost:3000"),
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  requestPasswordReset,
  resetPassword,
  updateUser,
} = authClient;
