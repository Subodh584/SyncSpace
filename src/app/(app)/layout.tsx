import Link from "next/link";
import { Layers } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/app/user-menu";
import { NotificationBell } from "@/components/app/notification-bell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="pt-safe sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link
            href="/workspaces"
            className="flex items-center gap-2 font-bold"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Layers className="h-5 w-5" />
            </div>
            <span className="hidden sm:inline">SyncSpace</span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell />
            <UserMenu
              name={user.name}
              email={user.email}
              image={user.image}
              workspaceUserId={user.workspaceUserId}
            />
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
