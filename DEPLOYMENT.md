# Deploying SyncSpace (Vercel + Turso)

This guide takes you from a local checkout to a live deployment on **Vercel**
backed by a **Turso** database.

---

## 1. Create a Turso database

Install the Turso CLI and sign in:

```bash
curl -sSfL https://get.tur.so/install.sh | bash
turso auth login
```

Create a database and grab its credentials:

```bash
turso db create syncspace
turso db show syncspace --url          # → TURSO_DATABASE_URL  (libsql://…)
turso db tokens create syncspace       # → TURSO_AUTH_TOKEN
```

---

## 2. Apply migrations to Turso

Point your local env at the production DB **temporarily** and run the migrator:

```bash
TURSO_DATABASE_URL="libsql://your-db.turso.io" \
TURSO_AUTH_TOKEN="your-token" \
npm run db:migrate
```

> Migrations live in `./drizzle` and are generated from `src/db/schema.ts`
> with `npm run db:generate`. Commit them so they ship with your repo.

(Optional) seed production demo data the same way with `npm run db:seed`.

---

## 3. Push to GitHub

```bash
git init
git add -A
git commit -m "Initial SyncSpace"
git branch -M main
git remote add origin https://github.com/<you>/syncspace.git
git push -u origin main
```

---

## 4. Import into Vercel

1. Go to https://vercel.com/new and import the repository.
2. Framework preset: **Next.js** (auto-detected). No build overrides needed.
3. Add the **Environment Variables** below, then **Deploy**.

### Required environment variables

| Variable               | Value                                                |
| ---------------------- | ---------------------------------------------------- |
| `TURSO_DATABASE_URL`   | `libsql://your-db.turso.io`                          |
| `TURSO_AUTH_TOKEN`     | token from `turso db tokens create`                  |
| `BETTER_AUTH_SECRET`   | `openssl rand -base64 32`                            |
| `BETTER_AUTH_URL`      | your production URL, e.g. `https://syncspace.vercel.app` |
| `NEXT_PUBLIC_APP_URL`  | same production URL                                  |

> After Vercel assigns the final domain, make sure `BETTER_AUTH_URL` and
> `NEXT_PUBLIC_APP_URL` match it exactly (no trailing slash), then redeploy so
> auth cookies are issued for the correct origin.

---

## 5. Verify

- Visit the deployment URL → the landing page loads.
- Register a new account → you land on `/workspaces`.
- Create a workspace, add a task, add an expense, recalculate settlements.

---

## Notes & production hardening

- **Email** — password-reset links are logged to the server console by
  default. Wire a real provider (Resend, Postmark, …) in
  `sendResetPassword` inside `src/lib/auth.ts`.
- **Rate limiting** — `src/lib/rate-limit.ts` is in-memory (per instance). For
  multi-region scale, back it with Upstash Redis; the interface is unchanged.
- **Migrations on deploy** — this project applies migrations manually
  (step 2). If you prefer automatic application, add a `postbuild` script that
  runs `npm run db:migrate`, but be careful running migrations from serverless
  build steps.
- **Edge runtime warning** — Better Auth pulls in `jose`, which logs a benign
  Edge-runtime warning at build time. Auth runs on the Node.js runtime, so this
  does not affect functionality.
```
