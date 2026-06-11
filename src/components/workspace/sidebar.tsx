"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  RefreshCw,
  Coins,
  Scale,
  Users,
  FileBarChart,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/rotations", label: "Rotations", icon: RefreshCw },
  { href: "/expenses", label: "Expenses", icon: Coins },
  { href: "/settlements", label: "Settlements", icon: Scale },
  { href: "/members", label: "Members", icon: Users },
  { href: "/reports", label: "Reports", icon: FileBarChart },
];

export function WorkspaceSidebar({
  workspaceId,
  workspaceName,
  isOwner,
}: {
  workspaceId: string;
  workspaceName: string;
  isOwner: boolean;
}) {
  const pathname = usePathname();
  const base = `/workspaces/${workspaceId}`;
  const items = isOwner
    ? [...NAV, { href: "/settings", label: "Settings", icon: Settings }]
    : NAV;

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
              <Link
                key={item.href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
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
  const pathname = usePathname();
  const base = `/workspaces/${workspaceId}`;
  const items = isOwner
    ? [...NAV, { href: "/settings", label: "Settings", icon: Settings }]
    : NAV;
  return (
    <nav className="flex gap-1 overflow-x-auto border-b p-2 md:hidden">
      {items.map((item) => {
        const href = `${base}${item.href}`;
        const active =
          item.href === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={item.href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
