"use client";

import * as React from "react";
import Link from "next/link";
import { AlertOctagon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { NewNoticeDialog } from "@/components/notices/new-notice-dialog";
import { useNotices, useNoticeSummary } from "@/hooks/use-notices";
import { NOTICE_STATUS_LABELS, NOTICE_STATUS_VARIANT, type NoticeStatus } from "@/lib/types/notice";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

const STATUS_TABS: { value: NoticeStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "NEW", label: "New" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "DRAFTING", label: "Drafting" },
  { value: "WAITING_FOR_CLIENT", label: "Waiting for Client" },
  { value: "READY_TO_SUBMIT", label: "Ready to Submit" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CLOSED", label: "Closed" },
];

export default function NoticesPage() {
  const { hasPermission } = useAuth();
  const { t } = useLanguage();
  const [status, setStatus] = React.useState<NoticeStatus | "ALL">("ALL");
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: summary } = useNoticeSummary();
  const { data, isLoading, isError, refetch } = useNotices({
    status: status === "ALL" ? undefined : status,
    search: debouncedSearch || undefined,
  });

  if (!hasPermission("notices.view")) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-foreground">{t("pages.notices.title")}</h1>
        <EmptyState icon={AlertOctagon} title="You don't have access to Notices." description="Ask a Firm Admin or Manager to grant notices.view if you need this." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("pages.notices.title")}</h1>
          <p className="text-sm text-muted">{t("pages.notices.description")}</p>
        </div>
        {hasPermission("notices.manage") && <NewNoticeDialog />}
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
          <KpiCard icon={AlertOctagon} label="New" value={summary.new} accent="attention" />
          <KpiCard icon={AlertOctagon} label="In Progress" value={summary.underReview + summary.drafting} accent="info" />
          <KpiCard icon={AlertOctagon} label="Waiting on Client" value={summary.waitingForClient} accent="attention" />
          <KpiCard icon={AlertOctagon} label="Overdue" value={summary.overdue} accent="overdue" />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={status} onValueChange={(v) => setStatus(v as NoticeStatus | "ALL")}>
          <TabsList className="flex-wrap">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input placeholder="Search notice type, reference, client…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:w-72" />
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      )}

      {isError && <ErrorState description="We couldn't load notices." onRetry={() => refetch()} />}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState icon={AlertOctagon} title="No notices here." description="Nothing matches this filter right now." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Notice type</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Notice date</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((notice) => (
              <TableRow key={notice.id} className="cursor-pointer">
                <TableCell>
                  <Link href={`/notices/${notice.id}`} className="font-medium text-brand-700 hover:underline">
                    {notice.client.displayName}
                  </Link>
                </TableCell>
                <TableCell className="text-foreground">{notice.noticeType}</TableCell>
                <TableCell className="text-muted">{notice.referenceNumber}</TableCell>
                <TableCell className="text-muted">{new Date(notice.noticeDate).toLocaleDateString()}</TableCell>
                <TableCell className="text-muted">{notice.responseDeadline ? new Date(notice.responseDeadline).toLocaleDateString() : "—"}</TableCell>
                <TableCell className="text-muted">{notice.assignedUser?.fullName ?? "Unassigned"}</TableCell>
                <TableCell><Badge variant="neutral">{notice.priority}</Badge></TableCell>
                <TableCell><Badge variant={NOTICE_STATUS_VARIANT[notice.status]}>{NOTICE_STATUS_LABELS[notice.status]}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
