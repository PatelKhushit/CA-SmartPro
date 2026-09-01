import { ListChecks, Target, Users, Wallet, BarChart3, Bell } from "lucide-react";
import { PremiumCard, PremiumCardHeader } from "./premium-card";

const FEATURES = [
  { icon: ListChecks, title: "Daily Task Management" },
  { icon: Target, title: "Accuracy Tracking" },
  { icon: Users, title: "Client & Workload" },
  { icon: Wallet, title: "Income & Salary" },
  { icon: BarChart3, title: "Reports & Analytics" },
  { icon: Bell, title: "Reminders & Notifications" },
];

export function KeyFeaturesSection() {
  return (
    <PremiumCard>
      <PremiumCardHeader title="Key Features Highlight" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title }) => (
          <div
            key={title}
            className="flex flex-col items-start gap-2 rounded-xl border p-3 transition-all duration-200 hover:-translate-y-0.5"
            style={{ borderColor: "var(--dash-border)", background: "var(--dash-surface-2)" }}
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: "var(--dash-accent-bg)" }}
            >
              <Icon className="h-5 w-5" style={{ color: "var(--dash-accent-bright)" }} />
            </div>
            <p className="text-xs font-medium leading-tight" style={{ color: "var(--dash-text-primary)" }}>
              {title}
            </p>
          </div>
        ))}
      </div>
    </PremiumCard>
  );
}
