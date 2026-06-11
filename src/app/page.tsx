import Link from "next/link";
import {
  ArrowRight,
  CheckSquare,
  Coins,
  RefreshCw,
  Scale,
  Users,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: CheckSquare,
    title: "Smart Task Boards",
    desc: "Trello-style drag-and-drop boards with auto-assignment by round robin, equal, random or difficulty-weighted distribution.",
  },
  {
    icon: Coins,
    title: "Expense Splitting",
    desc: "Equal, percentage, fixed or custom splits across any group, with categories and a full history.",
  },
  {
    icon: Scale,
    title: "Optimised Settlements",
    desc: "Splitwise-style settlement engine that minimises the number of transactions needed to settle up.",
  },
  {
    icon: RefreshCw,
    title: "Rotations",
    desc: "Recurring responsibilities like cleaning and cooking rotate automatically with full history.",
  },
  {
    icon: Users,
    title: "Workspaces & Roles",
    desc: "Invite by searchable user ID or join code. Owners manage members, settings and ownership.",
  },
  {
    icon: Layers,
    title: "Fairness Scoring",
    desc: "See at a glance whether work and money are shared fairly across the group.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Layers className="h-5 w-5" />
            </div>
            <span className="text-lg">SyncSpace</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="container flex flex-col items-center py-24 text-center">
          <span className="mb-4 rounded-full border bg-muted px-4 py-1.5 text-sm text-muted-foreground">
            Splitwise × Trello × shared household management
          </span>
          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
            Share responsibilities and expenses,{" "}
            <span className="text-primary">fairly.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            SyncSpace helps roommates, hostels, families, project teams and
            clubs manage shared tasks, rotate chores, split expenses and settle
            up — all in one polished workspace.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/register">
                Create your workspace <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">I already have an account</Link>
            </Button>
          </div>
        </section>

        <section className="container grid gap-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          SyncSpace — built with Next.js, Turso, Drizzle &amp; Better Auth.
        </div>
      </footer>
    </div>
  );
}
