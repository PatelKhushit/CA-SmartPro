"use client";

import * as React from "react";

export type DashboardAccent = "emerald" | "blue" | "orange";

export const DASHBOARD_ACCENT_STORAGE_KEY = "ca-smartpro-dashboard-accent";

/** Preview swatches: off-white canvas, white card surface, accent, accent-bright, navy structure — a visual summary of the 60-30-10 rule each theme follows. */
export const DASHBOARD_ACCENTS: Array<{
  key: DashboardAccent;
  name: string;
  description: string;
  swatches: string[];
}> = [
  {
    key: "emerald",
    name: "Emerald Growth",
    description: "Recommended",
    swatches: ["#f8fafc", "#ffffff", "#16a34a", "#22c55e", "#0d1b2a"],
  },
  {
    key: "blue",
    name: "Electric Blue",
    description: "Calm and analytical",
    swatches: ["#f8fafc", "#ffffff", "#2563eb", "#60a5fa", "#0d1b2a"],
  },
  {
    key: "orange",
    name: "Sunset Orange",
    description: "Bold and energetic",
    swatches: ["#f8fafc", "#ffffff", "#f59e0b", "#fb923c", "#0d1b2a"],
  },
];

interface DashboardThemeContextValue {
  accent: DashboardAccent;
  setAccent: (accent: DashboardAccent) => void;
}

const DashboardThemeContext = React.createContext<DashboardThemeContextValue | undefined>(undefined);

export function DashboardThemeProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = React.useState<DashboardAccent>("emerald");

  React.useEffect(() => {
    // localStorage doesn't exist during SSR — reading it must happen in an
    // effect, not a lazy initializer, to avoid a hydration mismatch.
    const stored = localStorage.getItem(DASHBOARD_ACCENT_STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (DASHBOARD_ACCENTS.some((a) => a.key === stored)) setAccentState(stored as DashboardAccent);
  }, []);

  const setAccent = React.useCallback((next: DashboardAccent) => {
    setAccentState(next);
    localStorage.setItem(DASHBOARD_ACCENT_STORAGE_KEY, next);
  }, []);

  const value = React.useMemo(() => ({ accent, setAccent }), [accent, setAccent]);

  return <DashboardThemeContext.Provider value={value}>{children}</DashboardThemeContext.Provider>;
}

export function useDashboardTheme() {
  const ctx = React.useContext(DashboardThemeContext);
  if (!ctx) throw new Error("useDashboardTheme must be used within DashboardThemeProvider");
  return ctx;
}
