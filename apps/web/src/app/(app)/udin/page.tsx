"use client";

import * as React from "react";
import { toast } from "sonner";
import { BadgeCheck, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { NewUdinDialog } from "@/components/udin/new-udin-dialog";
import { GenerateUdinDialog } from "@/components/udin/generate-udin-dialog";
import { useUdinRecords, useUdinSummary, useCopyUdin, useUpdateUdin } from "@/hooks/use-udin";
import { UDIN_DOCUMENT_TYPE_LABELS, UDIN_STATUS_VARIANT, type UDINStatus, type UdinRecord } from "@/lib/types/udin";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiClientError } from "@/lib/api-client";

const STATUS_TABS: { value: UDINStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "GENERATED", label: "Generated" },
  { value: "VERIFIED", label: "Verified" },
  { value: "EXPIRED", label: "Expired" },
];

export default function UdinPage() {
  const { hasPermission } = useAuth();
  const { t } = useLanguage();
  const [status, setStatus] = React.useState<UDINStatus | "ALL">("ALL");
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [generating, setGenerating] = React.useState<UdinRecord | null>(null);

  const { data: summary } = useUdinSummary();
  const { data, isLoading, isError, refetch } = useUdinRecords({
    status: status === "ALL" ? undefined : status,
    search: debouncedSearch || undefined,
  });
  const copyUdin = useCopyUdin();
  const updateUdin = useUpdateUdin();

  const canManage = hasPermission("udin.manage");

  const doCopy = async (id: string) => {
    try {
      await copyUdin.mutateAsync(id);
      toast.success("Duplicated as a new pending entry.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't duplicate this entry.");
    }
  };

  const verify = async (id: string) => {
    try {
      await updateUdin.mutateAsync({ id, status: "VERIFIED" });
      toast.success("Marked verified.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Enter a UDIN number before verifying.");
    }
  };

  if (!hasPermission("udin.view")) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-foreground">{t("pages.udin.title")}</h1>
        <EmptyState icon={BadgeCheck} title="You don't have access to UDIN." description="Ask a Firm Admin or Manager to grant udin.view if you need this." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("pages.udin.title")}</h1>
          <p className="text-sm text-muted">{t("pages.udin.description")}</p>
        </div>
        {canManage && <NewUdinDialog />}
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard icon={BadgeCheck} label="Pending" value={summary.pending} accent="attention" />
          <KpiCard icon={BadgeCheck} label="Generated" value={summary.generated} accent="info" />
          <KpiCard icon={BadgeCheck} label="Verified" value={summary.verified} accent="completed" />
          <KpiCard icon={BadgeCheck} label="Expired" value={summary.expired} accent="neutral" />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={status} onValueChange={(v) => setStatus(v as UDINStatus | "ALL")}>
          <TabsList>
            {STATUS_TABS.map((tab) => <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        <Input placeholder="Search UDIN, description, client…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:w-72" />
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      )}

      {isError && <ErrorState description="We couldn't load UDIN records." onRetry={() => refetch()} />}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState icon={BadgeCheck} title="No UDIN entries here." description="Nothing matches this filter right now." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Document type</TableHead>
              <TableHead>Document date</TableHead>
              <TableHead>UDIN number</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium text-foreground">{record.client.displayName}</TableCell>
                <TableCell className="text-muted">{UDIN_DOCUMENT_TYPE_LABELS[record.documentType]}</TableCell>
                <TableCell className="text-muted">{new Date(record.documentDate).toLocaleDateString()}</TableCell>
                <TableCell className="font-mono text-xs text-foreground">{record.udinNumber ?? "—"}</TableCell>
                <TableCell className="text-muted">{record.assignedUser?.fullName ?? "Unassigned"}</TableCell>
                <TableCell><Badge variant={UDIN_STATUS_VARIANT[record.status]}>{record.status}</Badge></TableCell>
                <TableCell>
                  {canManage && (
                    <div className="flex gap-1">
                      {record.status === "PENDING" && (
                        <Button size="sm" variant="outline" onClick={() => setGenerating(record)}>Record</Button>
                      )}
                      {record.status === "GENERATED" && (
                        <Button size="sm" variant="outline" onClick={() => verify(record.id)}>Verify</Button>
                      )}
                      <Button size="icon" variant="ghost" aria-label="Duplicate" onClick={() => doCopy(record.id)}>
                        <Copy className="h-4 w-4 text-muted" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {generating && (
        <GenerateUdinDialog record={generating} open={!!generating} onOpenChange={(v) => !v && setGenerating(null)} />
      )}
    </div>
  );
}
