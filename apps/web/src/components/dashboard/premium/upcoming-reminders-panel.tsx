"use client";

import Link from "next/link";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { useComplianceEvents } from "@/hooks/use-compliance-events";
import { PremiumCard, PremiumCardHeader } from "./premium-card";

function formatDueDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function isDueSoon(iso: string) {
  const days = (new Date(iso).getTime() - Date.now()) / 86_400_000;
  return days <= 7;
}

export function UpcomingRemindersPanel() {
  const { data, isLoading, isError, refetch } = useComplianceEvents({ status: "UPCOMING" });
  const upcoming = (data ?? [])
    .slice()
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  return (
    <PremiumCard className="flex h-full flex-col">
      <PremiumCardHeader
        title="Upcoming Reminders"
        action={
          <Link
            href="/compliance"
            className="text-xs font-medium transition-opacity hover:opacity-80"
            style={{ color: "var(--dash-accent-bright)" }}
          >
            View All
          </Link>
        }
      />
      {isError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8">
          <p className="text-sm" style={{ color: "var(--dash-text-secondary)" }}>
            Unable to load this section.
          </p>
          <button onClick={() => refetch()} className="text-xs font-medium" style={{ color: "var(--dash-accent-bright)" }}>
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded-lg" style={{ background: "var(--dash-border)" }} />
          ))}
        </div>
      ) : upcoming.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-8">
          <p className="text-sm" style={{ color: "var(--dash-text-secondary)" }}>
            No upcoming reminders.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-2">
          {upcoming.map((event) => {
            const dueSoon = isDueSoon(event.dueDate);
            const Icon = dueSoon ? AlertTriangle : CalendarClock;
            return (
              <Link
                key={event.id}
                href="/compliance"
                className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors"
                style={{ background: "var(--dash-surface-2)" }}
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: dueSoon ? "var(--dash-warning-bg)" : "var(--dash-accent-bg)" }}
                >
                  <Icon className="h-4 w-4" style={{ color: dueSoon ? "var(--dash-warning)" : "var(--dash-accent-bright)" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" style={{ color: "var(--dash-text-primary)" }}>
                    {event.complianceRule.name}
                  </p>
                  <p className="truncate text-xs" style={{ color: "var(--dash-text-secondary)" }}>
                    {event.client.displayName}
                  </p>
                </div>
                <span
                  className="shrink-0 text-xs font-medium"
                  style={{ color: dueSoon ? "var(--dash-warning)" : "var(--dash-text-secondary)" }}
                >
                  {formatDueDate(event.dueDate)}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </PremiumCard>
  );
}
