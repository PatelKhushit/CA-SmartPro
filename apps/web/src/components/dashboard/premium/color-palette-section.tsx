"use client";

import { useDashboardTheme, DASHBOARD_ACCENTS } from "@/lib/dashboard-theme";
import { PremiumCard, PremiumCardHeader } from "./premium-card";

export function ColorPaletteSection() {
  const { accent } = useDashboardTheme();
  const theme = DASHBOARD_ACCENTS.find((t) => t.key === accent) ?? DASHBOARD_ACCENTS[0]!;

  return (
    <PremiumCard>
      <PremiumCardHeader title={`Color Palette (${theme.name})`} />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {theme.swatches.map((color) => (
          <div key={color} className="flex flex-col items-center gap-1.5">
            <div className="h-12 w-full rounded-lg" style={{ background: color, border: "1px solid var(--dash-border)" }} />
            <span className="font-mono text-[10px]" style={{ color: "var(--dash-text-secondary)" }}>
              {color}
            </span>
          </div>
        ))}
      </div>
    </PremiumCard>
  );
}
