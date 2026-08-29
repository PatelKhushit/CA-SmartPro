"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

// Must match the key read by the bootstrap script in app/layout.tsx.
const THEME_STORAGE_KEY = "ca-smartpro-theme";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<Theme>("light");

  React.useEffect(() => {
    // Reading the DOM attribute set by the pre-hydration bootstrap script
    // must happen in an effect (not during render) — it doesn't exist
    // server-side, so reading it earlier would cause a hydration mismatch.
    const current = document.documentElement.getAttribute("data-theme");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (current === "dark") setTheme("dark");
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
  };

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light workspace" : "Switch to dark workspace"}
      title={theme === "dark" ? "Switch to light workspace" : "Switch to dark workspace"}
      className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-muted-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
