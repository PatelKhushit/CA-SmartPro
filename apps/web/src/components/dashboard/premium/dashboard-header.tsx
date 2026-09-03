function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function DashboardHeader({ firstName }: { firstName: string }) {
  const dateLabel = new Date().toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold sm:text-[26px]" style={{ color: "var(--dash-text-primary)" }}>
          {greeting()}, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--dash-text-secondary)" }}>
          Here&apos;s what needs your attention today.
        </p>
      </div>
      <div
        className="w-fit shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium"
        style={{ borderColor: "var(--dash-border)", color: "var(--dash-text-secondary)", background: "var(--dash-surface)" }}
      >
        {dateLabel}
      </div>
    </div>
  );
}
