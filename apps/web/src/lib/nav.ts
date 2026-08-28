import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Calculator,
  CalendarDays,
  FileText,
  Home,
  ListChecks,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Shown in the primary mobile bottom bar (max 4, "More" covers the rest). */
  primaryMobile?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "My Day", href: "/my-day", icon: Home, primaryMobile: true },
  { label: "Clients", href: "/clients", icon: Users, primaryMobile: true },
  { label: "Work", href: "/tasks", icon: ListChecks, primaryMobile: true },
  { label: "Calendar", href: "/calendar", icon: CalendarDays, primaryMobile: true },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Calculator", href: "/calculator", icon: Calculator },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "AI Copilot", href: "/copilot", icon: Sparkles },
  { label: "Settings", href: "/settings", icon: Settings },
];
