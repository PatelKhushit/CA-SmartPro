"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Settings } from "lucide-react";
import { NAV_GROUPS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { Logo } from "@/components/brand/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(new Set());

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-navy md:flex">
      <div className="flex h-16 shrink-0 items-center px-5">
        <Logo variant="on-dark" />
      </div>
      <nav className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-2">
        {NAV_GROUPS.map((group) => {
          const isCollapsed = collapsedGroups.has(group.label);
          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className="flex w-full items-center justify-between px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-navy-muted hover:text-navy-foreground"
              >
                {t(group.labelKey)}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isCollapsed && "-rotate-90")} />
              </button>
              {!isCollapsed && (
                <div className="mt-1 flex flex-col gap-1">
                  {group.items.map((item) => {
                    const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2 text-sm font-medium transition-all duration-200",
                          active
                            ? "text-white"
                            : "text-navy-muted hover:bg-navy-surface hover:text-navy-foreground",
                        )}
                        style={
                          active
                            ? {
                                background: "var(--dash-accent-bg, var(--brand-500))",
                                borderLeftColor: "var(--dash-accent-bright, var(--brand-500))",
                                boxShadow: "0 0 16px var(--dash-accent-glow, transparent)",
                                color: "var(--dash-accent-bright, white)",
                              }
                            : undefined
                        }
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{t(item.labelKey)}</span>
                        {item.comingSoon && !active && (
                          <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-navy-muted/60" title="Coming soon" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      {user && (
        <button
          onClick={() => router.push("/settings")}
          className="flex shrink-0 items-center gap-3 border-t border-navy-border px-4 py-3 text-left transition-colors hover:bg-navy-surface"
        >
          <Avatar className="h-9 w-9 border" style={{ borderColor: "var(--dash-accent, transparent)" }}>
            <AvatarFallback>{initials(user.fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-navy-foreground">{user.fullName}</p>
            <p className="truncate text-xs text-navy-muted">{user.role.name}</p>
          </div>
          <Settings className="h-4 w-4 shrink-0 text-navy-muted" />
        </button>
      )}
    </aside>
  );
}
