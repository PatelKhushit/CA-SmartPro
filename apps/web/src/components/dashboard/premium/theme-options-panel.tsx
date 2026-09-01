"use client";

import { Check } from "lucide-react";
import { useDashboardTheme, DASHBOARD_ACCENTS } from "@/lib/dashboard-theme";
import { PremiumCard } from "./premium-card";

export function ThemeOptionsPanel() {
  const { accent, setAccent } = useDashboardTheme();

  return (
    <PremiumCard>
      <h3
        className="mb-4 text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--dash-text-secondary)" }}
      >
        Premium Theme Options
      </h3>
      <div className="flex flex-col gap-3">
        {DASHBOARD_ACCENTS.map((theme) => {
          const isActive = theme.key === accent;
          return (
            <button
              key={theme.key}
              type="button"
              onClick={() => setAccent(theme.key)}
              aria-pressed={isActive}
              className="flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200"
              style={{
                borderColor: isActive ? theme.swatches[2] : "var(--dash-border)",
                background: isActive ? "var(--dash-surface-2)" : "transparent",
                boxShadow: isActive ? `0 0 16px ${theme.swatches[2]}55` : "none",
              }}
            >
              <div className="flex -space-x-1.5">
                {theme.swatches.map((color, i) => (
                  <span
                    key={i}
                    className="h-5 w-5 rounded-full border-2"
                    style={{ background: color, borderColor: "var(--dash-surface)" }}
                  />
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" style={{ color: "var(--dash-text-primary)" }}>
                  {theme.name}
                </p>
                <p className="truncate text-[11px]" style={{ color: "var(--dash-text-secondary)" }}>
                  {theme.description}
                </p>
              </div>
              {isActive && (
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                  style={{ background: theme.swatches[2] }}
                >
                  <Check className="h-3 w-3 text-white" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </PremiumCard>
  );
}
