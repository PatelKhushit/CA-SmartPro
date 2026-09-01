"use client";

import * as React from "react";

export type DashboardAccent = "purple" | "blue" | "green";

export const DASHBOARD_ACCENT_STORAGE_KEY = "ca-smartpro-dashboard-accent";

export const DASHBOARD_ACCENTS: Array<{
  key: DashboardAccent;
  name: string;
  description: string;
  swatches: string[];
}> = [
  {
    key: "purple",
    name: "Midnight Purple",
    description: "Recommended",
    swatches: ["#0d0d1a", "#1a1a2e", "#6c5ce7", "#a78bfa", "#22c55e"],
  },
  {
    key: "blue",
    name: "Ocean Blue",
    description: "Calm and analytical",
    swatches: ["#0d0d1a", "#1a1a2e", "#2563eb", "#60a5fa", "#22c55e"],
  },
  {
    key: "green",
    name: "Emerald Green",
    description: "Fresh and focused",
    swatches: ["#0d0d1a", "#1a1a2e", "#059669", "#34d399", "#22c55e"],
  },
];

interface DashboardThemeContextValue {
  accent: DashboardAccent;
  setAccent: (accent: DashboardAccent) => void;
}

const DashboardThemeContext = React.createContext<DashboardThemeContextValue | undefined>(undefined);

export function DashboardThemeProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = React.useState<DashboardAccent>("purple");

  React.useEffect(() => {
    // localStorage doesn't exist during SSR — reading it must happen in an
    // effect, not a lazy initializer, to avoid a hydration mismatch.
    const stored = localStorage.getItem(DASHBOARD_ACCENT_STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "purple" || stored === "blue" || stored === "green") setAccentState(stored);
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
