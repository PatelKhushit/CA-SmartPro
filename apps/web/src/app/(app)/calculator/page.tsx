"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CALCULATORS } from "@/lib/calculator-configs";
import { CalculatorRunner } from "@/components/calculator/calculator-runner";
import { useLanguage } from "@/lib/i18n/language-context";

export default function CalculatorPage() {
  const { t } = useLanguage();
  const [activeId, setActiveId] = React.useState(CALCULATORS[0].id);
  const active = CALCULATORS.find((c) => c.id === activeId)!;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t("pages.calculator.title")}</h1>
        <p className="text-sm text-muted">{t("pages.calculator.description")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {CALCULATORS.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                activeId === c.id ? "bg-brand-50 text-brand-700" : "text-muted hover:bg-muted-surface hover:text-foreground",
              )}
            >
              {c.title}
            </button>
          ))}
        </nav>

        <CalculatorRunner key={active.id} config={active} />
      </div>
    </div>
  );
}
