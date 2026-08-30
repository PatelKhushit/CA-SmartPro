"use client";

import Link from "next/link";
import { AlertOctagon, BadgeCheck, Building2, ClipboardCheck, Landmark, Percent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useGstSummary } from "@/hooks/use-gst";
import { useTdsSummary } from "@/hooks/use-tds";
import { useUdinSummary } from "@/hooks/use-udin";
import { useNoticeSummary } from "@/hooks/use-notices";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";

interface ModuleCard {
  key: string;
  labelKey: string;
  href: string;
  icon: typeof Percent;
  permission: string;
  comingSoon?: boolean;
  stat?: { value: number; labelKey: string; accent?: "attention" | "overdue" };
}

export default function TaxComplianceOverviewPage() {
  const { hasPermission } = useAuth();
  const { t } = useLanguage();
  const { data: gst } = useGstSummary();
  const { data: tds } = useTdsSummary();
  const { data: udin } = useUdinSummary();
  const { data: notices } = useNoticeSummary();

  const modules: ModuleCard[] = [
    { key: "gst", labelKey: "nav.items.gst", href: "/gst", icon: Percent, permission: "gst.view", stat: gst ? { value: gst.overdue, labelKey: "pages.taxCompliance.overdueReturns", accent: gst.overdue > 0 ? "overdue" : undefined } : undefined },
    { key: "tds", labelKey: "nav.items.tds", href: "/tds", icon: Percent, permission: "tds.view", stat: tds ? { value: tds.overdue, labelKey: "pages.taxCompliance.overdueReturns", accent: tds.overdue > 0 ? "overdue" : undefined } : undefined },
    { key: "income-tax", labelKey: "nav.items.incomeTax", href: "/income-tax", icon: Landmark, permission: "compliance.manage", comingSoon: true },
    { key: "audit", labelKey: "nav.items.audit", href: "/audit", icon: ClipboardCheck, permission: "compliance.manage", comingSoon: true },
    { key: "roc-mca", labelKey: "nav.items.rocMca", href: "/roc-mca", icon: Building2, permission: "compliance.manage", comingSoon: true },
    { key: "udin", labelKey: "nav.items.udin", href: "/udin", icon: BadgeCheck, permission: "udin.view", stat: udin ? { value: udin.pending, labelKey: "pages.taxCompliance.pending" } : undefined },
    { key: "notices", labelKey: "nav.items.notices", href: "/notices", icon: AlertOctagon, permission: "notices.view", stat: notices ? { value: notices.overdue, labelKey: "pages.taxCompliance.overdue", accent: notices.overdue > 0 ? "overdue" : undefined } : undefined },
  ];

  const visible = modules.filter((m) => hasPermission(m.permission));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t("pages.taxCompliance.title")}</h1>
        <p className="text-sm text-muted">{t("pages.taxCompliance.description")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((mod) => (
          <Link
            key={mod.key}
            href={mod.href}
            className={cn(
              "flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md",
              mod.comingSoon && "opacity-80",
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted-surface">
                <mod.icon className="h-5 w-5 text-brand-700" />
              </div>
              {mod.comingSoon && <Badge variant="neutral">{t("pages.taxCompliance.comingSoon")}</Badge>}
            </div>
            <div>
              <p className="font-semibold text-foreground">{t(mod.labelKey)}</p>
              {mod.stat ? (
                <p className={cn("text-sm", mod.stat.accent === "overdue" ? "text-status-overdue" : "text-muted")}>
                  {mod.stat.value} {t(mod.stat.labelKey)}
                </p>
              ) : mod.comingSoon ? (
                <p className="text-sm text-muted">{t("pages.taxCompliance.notBuilt")}</p>
              ) : (
                <p className="text-sm text-muted">{t("pages.taxCompliance.loading")}</p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="text-sm text-muted">{t("pages.taxCompliance.noAccess")}</p>
      )}
    </div>
  );
}
