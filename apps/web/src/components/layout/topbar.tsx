"use client";

import { LogOut, Plus, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { useQuickCreate } from "@/lib/quick-create-context";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSwitcher } from "./language-switcher";
import { GlobalSearch } from "./global-search";
import { RunningTimerIndicator } from "./running-timer-indicator";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Topbar() {
  const { user, logout, hasPermission } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const quickCreate = useQuickCreate();

  const canCreateClient = hasPermission("clients.create");
  const canCreateTask = hasPermission("tasks.create");

  return (
    <header className="flex h-16 items-center gap-4 border-b border-border bg-surface px-4 md:px-6">
      <GlobalSearch />
      <div className="flex-1" />
      <RunningTimerIndicator />
      {(canCreateClient || canCreateTask) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" /> Create
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canCreateClient && (
              <DropdownMenuItem onSelect={() => quickCreate.setNewClientOpen(true)}>New client</DropdownMenuItem>
            )}
            {canCreateTask && (
              <DropdownMenuItem onSelect={() => quickCreate.setNewTaskOpen(true)}>New task</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <LanguageSwitcher />
      <ThemeToggle />
      <NotificationBell />
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
          <Avatar>
            <AvatarFallback>{user ? initials(user.fullName) : <UserIcon className="h-4 w-4" />}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <p className="font-medium text-foreground">{user?.fullName}</p>
            <p className="text-xs text-muted">{user?.role.name}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => router.push("/settings")}>{t("topbar.firmSettings")}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void logout()} className="text-status-overdue">
            <LogOut className="mr-2 h-4 w-4" /> {t("topbar.signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
