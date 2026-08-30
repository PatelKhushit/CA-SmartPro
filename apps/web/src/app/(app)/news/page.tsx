"use client";

import * as React from "react";
import { toast } from "sonner";
import { ExternalLink, Newspaper, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNews, useRefreshNews } from "@/hooks/use-news";
import { NEWS_CATEGORY_LABELS, type NewsCategory } from "@/lib/types/news";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiClientError } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n/language-context";

const CATEGORY_TABS: { value: NewsCategory | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "GST", label: NEWS_CATEGORY_LABELS.GST },
  { value: "TDS", label: NEWS_CATEGORY_LABELS.TDS },
  { value: "INCOME_TAX", label: NEWS_CATEGORY_LABELS.INCOME_TAX },
  { value: "COMPANY_LAW", label: NEWS_CATEGORY_LABELS.COMPANY_LAW },
  { value: "AUDIT", label: NEWS_CATEGORY_LABELS.AUDIT },
  { value: "ICAI", label: NEWS_CATEGORY_LABELS.ICAI },
  { value: "OTHER", label: NEWS_CATEGORY_LABELS.OTHER },
];

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NewsPage() {
  const { t } = useLanguage();
  const [category, setCategory] = React.useState<NewsCategory | "ALL">("ALL");
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading, isError, refetch } = useNews({
    category: category === "ALL" ? undefined : category,
    search: debouncedSearch || undefined,
  });
  const refresh = useRefreshNews();

  const doRefresh = async () => {
    try {
      await refresh.mutateAsync();
      toast.success("News refreshed.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't refresh news right now.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("pages.news.title")}</h1>
          <p className="text-sm text-muted">{t("pages.news.description")}</p>
        </div>
        <Button size="sm" variant="outline" onClick={doRefresh} disabled={refresh.isPending}>
          <RefreshCw className={`h-4 w-4 ${refresh.isPending ? "animate-spin" : ""}`} /> {refresh.isPending ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {data && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>Updated {timeAgo(data.fetchedAt)}</span>
          <span>·</span>
          <span>Sources: {data.sources.join(", ")}</span>
          {data.failedSources.length > 0 && (
            <Badge variant="attention">
              {data.failedSources.join(", ")} unreachable right now — showing the rest
            </Badge>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={category} onValueChange={(v) => setCategory(v as NewsCategory | "ALL")}>
          <TabsList className="flex-wrap">
            {CATEGORY_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input placeholder="Search headlines…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:w-72" />
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      )}

      {isError && <ErrorState description="We couldn't load news right now." onRetry={() => refetch()} />}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState icon={Newspaper} title="No news here." description="Nothing matches this filter right now — try a different category or search term." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.items.map((article) => (
            <a
              key={article.id}
              href={article.link}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-foreground">{article.title}</p>
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
              </div>
              {article.summary && <p className="text-sm text-muted">{article.summary}</p>}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <Badge variant="neutral">{NEWS_CATEGORY_LABELS[article.category]}</Badge>
                <span>{article.sourceName}</span>
                {article.publishedAt && (
                  <>
                    <span>·</span>
                    <span>{timeAgo(article.publishedAt)}</span>
                  </>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
