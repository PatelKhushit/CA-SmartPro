"use client";

import * as React from "react";
import { en, type Dictionary } from "./dictionaries/en";
import { hi } from "./dictionaries/hi";
import { gu } from "./dictionaries/gu";

export type Language = "en" | "hi" | "gu";

export const LANGUAGE_STORAGE_KEY = "ca-smartpro-language";

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  hi: "हिन्दी",
  gu: "ગુજરાતી",
};

const DICTIONARIES: Record<Language, Dictionary> = { en, hi, gu };

function getPath(dict: Dictionary, path: string): unknown {
  return path.split(".").reduce<unknown>((node, segment) => {
    if (node && typeof node === "object" && segment in node) {
      return (node as Record<string, unknown>)[segment];
    }
    return undefined;
  }, dict);
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  /** Looks up a dot-path key in the active dictionary, falling back to English, then the key itself. Never throws. */
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = React.createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = React.useState<Language>("en");

  React.useEffect(() => {
    // Reading localStorage must happen post-hydration (server always renders
    // English) — this is the same deliberate pattern as the theme toggle.
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "en" || stored === "hi" || stored === "gu") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLanguageState(stored);
      document.documentElement.lang = stored;
    }
  }, []);

  const setLanguage = React.useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, []);

  const t = React.useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const active = getPath(DICTIONARIES[language], key);
      const fallback = getPath(en, key);
      let text = typeof active === "string" ? active : typeof fallback === "string" ? fallback : key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.replace(`{{${name}}}`, String(value));
        }
      }
      return text;
    },
    [language],
  );

  const value = React.useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = React.useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
