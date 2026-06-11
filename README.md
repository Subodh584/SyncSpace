# SyncSpace — Shared Workspace Manager

SyncSpace helps groups — roommates, hostel students, families, project teams,
friend groups, clubs — manage shared **tasks**, **rotations**, **expenses**,
**settlements** and **fairness**, with a polished SaaS experience.

Think **Splitwise × Trello × shared household manager**.

---

## ✨ Features

- **Auth** — register, login, logout, password reset, profile management
  (Better Auth). Every user gets a unique searchable Workspace ID like
  `subodh_1234` used for invitations.
- **Workspaces & roles** — owners and members; invite by user ID or join code;
  transfer ownership; configurable defaults.
- **Tasks** — Trello-style drag-and-drop board (Pending / In Progress /
  Completed), priority, difficulty weight, due dates, reassignment.
- **Automatic assignment** — Round Robin, Random, Equal Distribution, and
  Weighted-by-difficulty algorithms.
- **Rotations** — recurring responsibilities (cleaning, cooking…) with current
  / next assignee, rotation history and one-click advance.
- **Expenses** — Equal, Percentage, Fixed and Custom-participant splits across
  six categories.
- **Settlement engine** — computes net balances and a **minimised** set of
  "who pays whom" transactions (Splitwise-style).
- **Fairness scoring** — 0–100 per-member and workspace scores blending task
  load and expense contribution, with visual indicators.
- **Notifications** — invitations, task assignment, expenses, settlements,
  rotations, with an unread badge.
- **Reports** — Task / Expense / Settlement / Fairness exported as
  **CSV, Excel (.xlsx)** and **PDF**.
- **UX** — dark/light mode, sidebar navigation, loading skeletons, empty
  states, toasts, responsive layout.

---

## 🧱 Tech stack

| Layer        | Technology                                            |
| ------------ | ----------------------------------------------------- |
| Framework    | Next.js 15 (App Router) + TypeScript                  |
| Styling      | Tailwind CSS + shadcn/ui (Radix primitives)           |
| Backend      | Next.js Route Handlers + Server Actions               |
| Database     | Turso (LibSQL / hosted SQLite) + Drizzle ORM          |
| Auth         | Better Auth (email + password)                        |
| Validation   | Zod                                                   |
| Deployment   | Vercel                                                |

---

## 🚀 Getting started

### 1. Prerequisites

- Node.js 20+ and npm
- (Production) a free Turso account → https://turso.tech

### 2. Install

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

For **local development** the defaults work as-is — they use a local SQLite
file (`file:./local.db`). Generate a real auth secret:

```bash
# put the output in BETTER_AUTH_SECRET
openssl rand -base64 32
```

| Variable               | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| `TURSO_DATABASE_URL`   | `file:./local.db` locally, or your Turso libsql URL  |
| `TURSO_AUTH_TOKEN`     | Empty locally; Turso token in production             |
| `BETTER_AUTH_SECRET`   | Random 32-byte secret                                |
| `BETTER_AUTH_URL`      | App URL (`http://localhost:3000` locally)            |
| `NEXT_PUBLIC_APP_URL`  | Same URL, exposed to the browser auth client         |

### 4. Create the database schema

```bash
npm run db:migrate     # apply migrations from ./drizzle
```

### 5. (Optional) Seed demo data

```bash
npm run db:seed
```

This creates the **“Boys Hostel Room 302”** workspace with four users, tasks,
expenses, a rotation and pre-computed settlements. Log in with any of:

```
subodh@demo.dev / password123
rahul@demo.dev  / password123
amit@demo.dev   / password123
rohit@demo.dev  / password123
```

### 6. Run

```bash
npm run dev
```

Open http://localhost:3000.

---

## 📜 npm scripts

| Script                | What it does                                 |
| --------------------- | -------------------------------------------- |
| `npm run dev`         | Start the dev server                         |
| `npm run build`       | Production build                             |
| `npm run start`       | Run the production build                     |
| `npm run typecheck`   | `tsc --noEmit`                               |
| `npm run db:generate` | Generate a new migration from `schema.ts`    |
| `npm run db:migrate`  | Apply migrations                             |
| `npm run db:push`     | Push schema directly (dev shortcut)          |
| `npm run db:studio`   | Open Drizzle Studio                          |
| `npm run db:seed`     | Seed demo data                               |

---

## 🗂 Project structure

```
src/
├── app/
│   ├── (auth)/            # login, register, forgot/reset password
│   ├── (app)/             # authenticated shell (top bar + workspace sidebar)
│   │   ├── workspaces/    # list + [id]/{dashboard,tasks,rotations,expenses,
│   │   │                  #          settlements,members,reports,settings}
│   │   ├── invitations/
│   │   └── settings/      # profile
│   └── api/               # REST route handlers (auth, workspaces, tasks, …)
├── actions/               # Server Actions (workspaces, tasks, expenses, …)
├── components/            # ui/ (shadcn) + feature components
├── db/                    # schema.ts, index.ts, migrate.ts, seed.ts
├── lib/
│   ├── algorithms/        # assignment, settlement, splits, fairness, rotation
│   ├── services/          # data-access helpers (members, expenses, reports…)
│   ├── auth.ts            # Better Auth server config
│   ├── auth-client.ts     # Better Auth React client
│   ├── auth-helpers.ts    # session + workspace authorization guards
│   └── validations.ts     # Zod schemas
└── middleware.ts          # route protection
```

---

## 🧮 Algorithms (the interesting bits)

- **Assignment** (`lib/algorithms/assignment.ts`) — round-robin, random,
  least-loaded equal distribution, and greedy weighted distribution.
- **Settlement** (`lib/algorithms/settlement.ts`) — computes balances then
  greedily matches the largest debtor with the largest creditor to minimise
  the number of transactions.
- **Splits** (`lib/algorithms/splits.ts`) — equal/percentage/fixed/custom with
  rounding-remainder handling so splits always reconcile to the total.
- **Fairness** (`lib/algorithms/fairness.ts`) — maps each member's task and
  expense contribution against their fair share onto a 0–100 score.

---

## 🔐 Security

- Session-cookie auth via Better Auth; `middleware.ts` protects app routes.
- Every Server Action and API route enforces **workspace-level authorization**
  (`requireMember` / `requireOwner`).
- All input is validated with **Zod**.
- A lightweight in-memory **rate limiter** guards sensitive mutations
  (swap for Upstash Redis at scale).

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for shipping to Vercel + Turso.
