import * as React from "react";
import { cn } from "@/lib/utils";

/** Base card for the premium dashboard shell — consumes --dash- tokens only (never --brand- or --status-), so it never leaks into the rest of the app's styling. */
export function PremiumCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5",
        className,
      )}
      style={{
        background: "var(--dash-surface)",
        borderColor: "var(--dash-border)",
        color: "var(--dash-text-primary)",
      }}
    >
      {children}
    </div>
  );
}

export function PremiumCardHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h3 className="text-base font-semibold" style={{ color: "var(--dash-text-primary)" }}>
        {title}
      </h3>
      {action}
    </div>
  );
}
