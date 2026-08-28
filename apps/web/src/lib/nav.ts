import type { LucideIcon } from "lucide-react";
import {
  AlertOctagon,
  BadgeCheck,
  BarChart3,
  Building2,
  Calculator,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Home,
  Landmark,
  Mic,
  MessageSquare,
  Percent,
  PhoneCall,
  Receipt,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCog,
  Users,
  ListChecks,
  Wallet,
  Workflow,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Shown in the primary mobile bottom bar (max 4, "More" covers the rest). */
  primaryMobile?: boolean;
  /** Links to a real, honest placeholder page — not a dead link, not faked data. */
  comingSoon?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Main",
    items: [
      { label: "My Day", href: "/my-day", icon: Home, primaryMobile: true },
      { label: "Clients", href: "/clients", icon: Users, primaryMobile: true },
      { label: "Tasks", href: "/tasks", icon: ListChecks, primaryMobile: true },
      { label: "Compliance", href: "/compliance", icon: ShieldCheck },
      { label: "Calendar", href: "/calendar", icon: CalendarDays, primaryMobile: true },
    ],
  },
  {
    label: "Work",
    items: [
      { label: "Documents", href: "/documents", icon: FileText },
      { label: "Document Requests", href: "/document-requests", icon: ClipboardList },
      { label: "Follow-ups", href: "/follow-ups", icon: PhoneCall },
      { label: "Communication", href: "/communication", icon: MessageSquare, comingSoon: true },
      { label: "Payments", href: "/payments", icon: Wallet, comingSoon: true },
      { label: "Invoices", href: "/invoices", icon: Receipt, comingSoon: true },
      { label: "Calculator", href: "/calculator", icon: Calculator },
    ],
  },
  {
    label: "Tax & Compliance",
    items: [
      { label: "GST", href: "/gst", icon: Percent, comingSoon: true },
      { label: "TDS", href: "/tds", icon: Percent, comingSoon: true },
      { label: "Income Tax", href: "/income-tax", icon: Landmark, comingSoon: true },
      { label: "Audit", href: "/audit", icon: ClipboardCheck, comingSoon: true },
      { label: "ROC / MCA", href: "/roc-mca", icon: Building2, comingSoon: true },
      { label: "UDIN", href: "/udin", icon: BadgeCheck, comingSoon: true },
      { label: "Notices", href: "/notices", icon: AlertOctagon, comingSoon: true },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "AI Copilot", href: "/copilot", icon: Sparkles },
      { label: "Voice Assistant", href: "/voice", icon: Mic, comingSoon: true },
      { label: "Reports", href: "/reports", icon: BarChart3 },
      { label: "Analytics", href: "/analytics", icon: TrendingUp, comingSoon: true },
    ],
  },
  {
    label: "Admin",
    items: [
      { label: "Team", href: "/team", icon: UserCog, comingSoon: true },
      { label: "Automations", href: "/automations", icon: Workflow, comingSoon: true },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

/** Flattened view of every nav item — used by mobile nav and anywhere that doesn't care about grouping. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);
