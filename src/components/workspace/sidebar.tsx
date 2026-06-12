"use client";

import { useTransition } from "react";
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
  const base = `/workspaces/${workspaceId}`;
  const items = isOwner
    ? [...NAV, { href: "/settings", label: "Settings", icon: Settings }]
    : NAV;

  function navigate(href: string) {
    if (href === pathname) return;
    startTransition(() => router.push(href));
  }

  return { pathname, base, items, isPending, navigate };
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
  const { pathname, base, items, isPending, navigate } = useNavItems(
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
                {isPending && active ? (
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
  const { pathname, base, items, isPending, navigate } = useNavItems(
    workspaceId,
    isOwner,
  );
  return (
    <nav className="flex gap-1 overflow-x-auto border-b p-2 md:hidden">
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
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground",
            )}
          >
            {isPending && active ? (
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
