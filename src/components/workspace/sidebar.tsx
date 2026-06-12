"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  RefreshCw,
  Coins,
  Scale,
  Users,
  FileBarChart,
  Settings,
  Loader2,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/rotations", label: "Rotations", icon: RefreshCw },
  { href: "/food", label: "Food", icon: UtensilsCrossed },
  { href: "/expenses", label: "Expenses", icon: Coins },
  { href: "/settlements", label: "Settlements", icon: Scale },
  { href: "/members", label: "Members", icon: Users },
  { href: "/reports", label: "Reports", icon: FileBarChart },
];

/** Tracks navigation pending state so a loader shows while the next tab loads. */
function useNavItems(workspaceId: string, isOwner: boolean) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // The href currently being navigated to, so the loader shows on the
  // destination tab — not the tab we're leaving.
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const base = `/workspaces/${workspaceId}`;
  const items = isOwner
    ? [...NAV, { href: "/settings", label: "Settings", icon: Settings }]
    : NAV;

  function navigate(href: string) {
    if (href === pathname) return;
    setPendingHref(href);
    startTransition(() => router.push(href));
  }

  // While a navigation is in flight, the destination is "loading".
  const loadingHref = isPending ? pendingHref : null;

  return { pathname, base, items, loadingHref, navigate };
}

export function WorkspaceSidebar({
  workspaceId,
  workspaceName,
  isOwner,
}: {
  workspaceId: string;
  workspaceName: string;
  isOwner: boolean;
}) {
  const { pathname, base, items, loadingHref, navigate } = useNavItems(
    workspaceId,
    isOwner,
  );

  return (
    <aside className="hidden w-60 shrink-0 border-r md:block">
      <div className="sticky top-16 p-3">
        <div className="mb-2 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Workspace
          </p>
          <p className="truncate font-semibold">{workspaceName}</p>
        </div>
        <nav className="space-y-1">
          {items.map((item) => {
            const href = `${base}${item.href}`;
            const active =
              item.href === ""
                ? pathname === base
                : pathname.startsWith(href);
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => navigate(href)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {loadingHref === href ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <item.icon className="h-4 w-4" />
                )}
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

/** Compact horizontal nav for small screens. */
export function WorkspaceMobileNav({
  workspaceId,
  isOwner,
}: {
  workspaceId: string;
  isOwner: boolean;
}) {
  const { pathname, base, items, loadingHref, navigate } = useNavItems(
    workspaceId,
    isOwner,
  );
  return (
    <nav className="no-scrollbar sticky top-16 z-30 flex gap-1 overflow-x-auto border-b bg-background/95 px-2 py-2 backdrop-blur md:hidden">
      {items.map((item) => {
        const href = `${base}${item.href}`;
        const active =
          item.href === "" ? pathname === base : pathname.startsWith(href);
        return (
          <button
            key={item.href}
            type="button"
            onClick={() => navigate(href)}
            className={cn(
              "flex min-h-[40px] shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground active:bg-accent",
            )}
          >
            {loadingHref === href ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <item.icon className="h-4 w-4" />
            )}
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
