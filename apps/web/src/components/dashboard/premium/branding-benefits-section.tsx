import { Sparkles, Smartphone, MousePointerClick, TrendingUp } from "lucide-react";
import { PremiumCard } from "./premium-card";

const BENEFITS = [
  { icon: Sparkles, title: "Premium UI/UX" },
  { icon: Smartphone, title: "Fully Responsive" },
  { icon: MousePointerClick, title: "Easy to Use" },
  { icon: TrendingUp, title: "Boost Productivity" },
];

export function BrandingBenefitsSection() {
  return (
    <PremiumCard>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold"
            style={{ background: "var(--dash-accent-bg)", color: "var(--dash-accent-bright)" }}
          >
            CA
          </div>
          <div>
            <p className="text-lg font-semibold" style={{ color: "var(--dash-text-primary)" }}>
              Designed for C.A. Professionals
            </p>
            <p className="text-sm" style={{ color: "var(--dash-text-secondary)" }}>
              Stay Organized. Stay Productive. Grow Your Practice.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {BENEFITS.map(({ icon: Icon, title }) => (
            <div
              key={title}
              className="flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all duration-200 hover:-translate-y-0.5"
              style={{ borderColor: "var(--dash-border)", background: "var(--dash-surface-2)" }}
            >
              <Icon className="h-5 w-5" style={{ color: "var(--dash-accent-bright)" }} />
              <p className="text-[11px] font-medium leading-tight" style={{ color: "var(--dash-text-primary)" }}>
                {title}
              </p>
            </div>
          ))}
        </div>
      </div>
    </PremiumCard>
  );
}
