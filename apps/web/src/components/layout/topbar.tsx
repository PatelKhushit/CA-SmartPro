"use client";

import { LogOut, User as UserIcon } from "lucide-react";
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
import { useAuth } from "@/lib/auth-context";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Topbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <header className="flex h-16 items-center gap-4 border-b border-border bg-surface px-4 md:px-6">
      <div className="flex-1" />
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
          <DropdownMenuItem onSelect={() => router.push("/settings")}>Firm settings</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void logout()} className="text-status-overdue">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
