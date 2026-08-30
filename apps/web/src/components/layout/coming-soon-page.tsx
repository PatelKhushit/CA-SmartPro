"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/language-context";

interface ComingSoonPageProps {
  /** Dot-path into pages.<pageKey> — resolves .title and .description. */
  pageKey: string;
  icon: LucideIcon;
}

/**
 * Honest placeholder for modules described in the product spec but not yet
 * built (real backend model + API + persistence) — matches the existing
 * "Coming soon — Phase 2" pattern used on Client 360. Never a fake UI with
 * mocked data standing in for a real feature.
 */
export function ComingSoonPage({ pageKey, icon }: ComingSoonPageProps) {
  const { t } = useLanguage();
  const title = t(`pages.${pageKey}.title`);
  const description = t(`pages.${pageKey}.description`);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      </div>
      <EmptyState
        icon={icon}
        title={`${title} — ${t("pages.taxCompliance.comingSoon").toLowerCase()}`}
        description={description}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/my-day">
              <ArrowLeft className="h-4 w-4" /> Back to My Day
            </Link>
          </Button>
        }
      />
    </div>
  );
}
