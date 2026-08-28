import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type KpiAccent = "neutral" | "info" | "attention" | "overdue" | "completed";

const ACCENT_CLASSES: Record<KpiAccent, { icon: string; iconBg: string; value: string }> = {
  neutral: { icon: "text-muted", iconBg: "bg-muted-surface", value: "text-foreground" },
  info: { icon: "text-status-in-progress", iconBg: "bg-status-in-progress-bg", value: "text-foreground" },
  attention: { icon: "text-status-attention", iconBg: "bg-status-attention-bg", value: "text-status-attention" },
  overdue: { icon: "text-status-overdue", iconBg: "bg-status-overdue-bg", value: "text-status-overdue" },
  completed: { icon: "text-status-completed", iconBg: "bg-status-completed-bg", value: "text-status-completed" },
};

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  /** Accent only applies once value > 0 — a zero-count card always reads neutral. */
  accent?: KpiAccent;
  href?: string;
}

/** Dashboard KPI card: icon, number, label, subtle status color, hover lift. Section 10/57 of the design spec. */
export function KpiCard({ icon: Icon, label, value, accent = "neutral", href }: KpiCardProps) {
  const resolved = value > 0 ? accent : "neutral";
  const classes = ACCENT_CLASSES[resolved];

  const content = (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", classes.iconBg)}>
        <Icon className={cn("h-5 w-5", classes.icon)} />
      </div>
      <div className="min-w-0">
        <p className={cn("text-2xl font-semibold leading-tight", classes.value)}>{value}</p>
        <p className="truncate text-xs text-muted">{label}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }
  return content;
}
