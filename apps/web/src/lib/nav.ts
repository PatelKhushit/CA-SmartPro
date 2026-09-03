import type { LucideIcon } from "lucide-react";
import {
  AlertOctagon,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Building2,
  Calculator,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileText,
  Home,
  LayoutGrid,
  Landmark,
  Mic,
  MessageSquare,
  Newspaper,
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
  /** Dot-path into the nav.items dictionary namespace — falls back to `label` (English) if missing. */
  labelKey: string;
  href: string;
  icon: LucideIcon;
  /** Shown in the primary mobile bottom bar (max 4, "More" covers the rest). */
  primaryMobile?: boolean;
  /** Links to a real, honest placeholder page — not a dead link, not faked data. */
  comingSoon?: boolean;
}

export interface NavGroup {
  label: string;
  /** Dot-path into the nav.groups dictionary namespace — falls back to `label` (English) if missing. */
  labelKey: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Main",
    labelKey: "nav.groups.main",
    items: [
      { label: "My Day", labelKey: "nav.items.myDay", href: "/my-day", icon: Home, primaryMobile: true },
      { label: "Clients", labelKey: "nav.items.clients", href: "/clients", icon: Users, primaryMobile: true },
      { label: "Tasks", labelKey: "nav.items.tasks", href: "/tasks", icon: ListChecks, primaryMobile: true },
      { label: "Compliance", labelKey: "nav.items.compliance", href: "/compliance", icon: ShieldCheck },
      { label: "Calendar", labelKey: "nav.items.calendar", href: "/calendar", icon: CalendarDays, primaryMobile: true },
    ],
  },
  {
    label: "Work",
    labelKey: "nav.groups.work",
    items: [
      { label: "Documents", labelKey: "nav.items.documents", href: "/documents", icon: FileText },
      { label: "Document Requests", labelKey: "nav.items.documentRequests", href: "/document-requests", icon: ClipboardList },
      { label: "Follow-ups", labelKey: "nav.items.followUps", href: "/follow-ups", icon: PhoneCall },
      { label: "Communication", labelKey: "nav.items.communication", href: "/communication", icon: MessageSquare, comingSoon: true },
      { label: "Payments", labelKey: "nav.items.payments", href: "/payments", icon: Wallet },
      { label: "Invoices", labelKey: "nav.items.invoices", href: "/invoices", icon: Receipt },
      { label: "Calculator", labelKey: "nav.items.calculator", href: "/calculator", icon: Calculator },
    ],
  },
  {
    label: "Tax & Compliance",
    labelKey: "nav.groups.taxCompliance",
    items: [
      { label: "Overview", labelKey: "nav.items.overview", href: "/tax-compliance", icon: LayoutGrid },
      { label: "GST", labelKey: "nav.items.gst", href: "/gst", icon: Percent },
      { label: "TDS", labelKey: "nav.items.tds", href: "/tds", icon: Percent },
      { label: "Income Tax", labelKey: "nav.items.incomeTax", href: "/income-tax", icon: Landmark },
      { label: "Audit", labelKey: "nav.items.audit", href: "/audit", icon: ClipboardCheck, comingSoon: true },
      { label: "ROC / MCA", labelKey: "nav.items.rocMca", href: "/roc-mca", icon: Building2 },
      { label: "UDIN", labelKey: "nav.items.udin", href: "/udin", icon: BadgeCheck },
      { label: "Notices", labelKey: "nav.items.notices", href: "/notices", icon: AlertOctagon },
    ],
  },
  {
    label: "Intelligence",
    labelKey: "nav.groups.intelligence",
    items: [
      { label: "AI Copilot", labelKey: "nav.items.aiCopilot", href: "/copilot", icon: Sparkles },
      { label: "Voice Assistant", labelKey: "nav.items.voiceAssistant", href: "/voice", icon: Mic },
      { label: "Knowledge Base", labelKey: "nav.items.knowledgeBase", href: "/knowledge", icon: BookOpen },
      { label: "Reports", labelKey: "nav.items.reports", href: "/reports", icon: BarChart3 },
      { label: "Analytics", labelKey: "nav.items.analytics", href: "/analytics", icon: TrendingUp, comingSoon: true },
      { label: "News", labelKey: "nav.items.news", href: "/news", icon: Newspaper },
    ],
  },
  {
    label: "Admin",
    labelKey: "nav.groups.admin",
    items: [
      { label: "Team", labelKey: "nav.items.team", href: "/team", icon: UserCog },
      { label: "Attendance", labelKey: "nav.items.attendance", href: "/attendance", icon: Clock },
      { label: "Leave", labelKey: "nav.items.leave", href: "/leave", icon: CalendarDays },
      { label: "Automations", labelKey: "nav.items.automations", href: "/automations", icon: Workflow },
      { label: "Settings", labelKey: "nav.items.settings", href: "/settings", icon: Settings },
    ],
  },
];

/** Flattened view of every nav item — used by mobile nav and anywhere that doesn't care about grouping. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);
