"use client";

import { Check, Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage, LANGUAGE_LABELS, type Language } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";

const LANGUAGES: Language[] = ["en", "hi", "gu"];

export function LanguageSwitcher({ variant = "default" }: { variant?: "default" | "on-dark" }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("topbar.language")}
        title={t("topbar.language")}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
          variant === "on-dark" ? "text-white/80 hover:bg-white/10" : "text-muted hover:bg-muted-surface",
        )}
      >
        <Languages className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem key={lang} onSelect={() => setLanguage(lang)} className="justify-between gap-4">
            {LANGUAGE_LABELS[lang]}
            {language === lang && <Check className="h-4 w-4 text-brand-600" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
