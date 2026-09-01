import type { LucideIcon } from "lucide-react";
import { PremiumCard } from "./premium-card";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  subtitle: string;
  subtitleTone?: "success" | "warning" | "muted";
  /** 0-100. When set, renders a thin progress bar under the value. */
  progress?: number;
  accent?: "accent" | "success" | "warning";
}

const TONE_COLOR: Record<NonNullable<StatCardProps["subtitleTone"]>, string> = {
  success: "var(--dash-success)",
  warning: "var(--dash-warning)",
  muted: "var(--dash-text-secondary)",
};

const ACCENT_VAR: Record<NonNullable<StatCardProps["accent"]>, string> = {
  accent: "var(--dash-accent)",
  success: "var(--dash-success)",
  warning: "var(--dash-warning)",
};

const ACCENT_BG_VAR: Record<NonNullable<StatCardProps["accent"]>, string> = {
  accent: "var(--dash-accent-bg)",
  success: "var(--dash-success-bg)",
  warning: "var(--dash-warning-bg)",
};

export function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  subtitleTone = "muted",
  progress,
  accent = "accent",
}: StatCardProps) {
  return (
    <PremiumCard className="flex h-full flex-col justify-between gap-3">
      <div className="flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: ACCENT_BG_VAR[accent] }}
        >
          <Icon className="h-5 w-5" style={{ color: ACCENT_VAR[accent] }} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-semibold leading-tight" style={{ color: "var(--dash-text-primary)" }}>
          {value}
        </p>
        <p className="mt-0.5 text-xs" style={{ color: "var(--dash-text-secondary)" }}>
          {label}
        </p>
      </div>
      {progress !== undefined ? (
        <div className="flex flex-col gap-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--dash-border)" }}>
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%`, background: ACCENT_VAR[accent] }}
            />
          </div>
          <p className="text-[11px] font-medium" style={{ color: TONE_COLOR[subtitleTone] }}>
            {subtitle}
          </p>
        </div>
      ) : (
        <p className="text-[11px] font-medium" style={{ color: TONE_COLOR[subtitleTone] }}>
          {subtitle}
        </p>
      )}
    </PremiumCard>
  );
}

export function StatCardSkeleton() {
  return (
    <PremiumCard className="flex h-full flex-col gap-3">
      <div className="h-10 w-10 animate-pulse rounded-xl" style={{ background: "var(--dash-border)" }} />
      <div className="flex flex-col gap-2">
        <div className="h-6 w-16 animate-pulse rounded" style={{ background: "var(--dash-border)" }} />
        <div className="h-3 w-24 animate-pulse rounded" style={{ background: "var(--dash-border)" }} />
      </div>
    </PremiumCard>
  );
}
