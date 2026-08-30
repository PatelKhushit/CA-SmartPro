"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MoreHorizontal, LogOut } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const { t } = useLanguage();
  const primary = NAV_ITEMS.filter((item) => item.primaryMobile);
  const more = NAV_ITEMS.filter((item) => !item.primaryMobile);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
      {primary.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium",
              active ? "text-brand-600" : "text-muted",
            )}
          >
            <item.icon className="h-5 w-5" />
            {t(item.labelKey)}
          </Link>
        );
      })}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted focus-visible:outline-none">
          <MoreHorizontal className="h-5 w-5" />
          More
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="mb-2">
          {more.map((item) => (
            <DropdownMenuItem key={item.href} onSelect={() => router.push(item.href)}>
              <item.icon className="mr-2 h-4 w-4" />
              {t(item.labelKey)}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void logout()} className="text-status-overdue">
            <LogOut className="mr-2 h-4 w-4" /> {t("topbar.signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
