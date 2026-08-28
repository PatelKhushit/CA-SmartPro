"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/brand/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-navy md:flex">
      <div className="flex h-16 items-center px-5">
        <Logo variant="on-dark" />
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-500 text-white"
                  : "text-navy-muted hover:bg-navy-surface hover:text-navy-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      {user && (
        <button
          onClick={() => router.push("/settings")}
          className="flex items-center gap-3 border-t border-navy-border px-4 py-3 text-left transition-colors hover:bg-navy-surface"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials(user.fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-navy-foreground">{user.organization.name}</p>
            <p className="truncate text-xs text-navy-muted">{user.fullName}</p>
          </div>
          <Settings className="h-4 w-4 shrink-0 text-navy-muted" />
        </button>
      )}
    </aside>
  );
}
