"use client";

import * as React from "react";
import { toast } from "sonner";
import { Building2, ClipboardList, FileUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { NewRocFilingDialog } from "@/components/roc/new-roc-filing-dialog";
import { UpdateRocFilingDialog } from "@/components/roc/update-roc-filing-dialog";
import { useRocFilings, useRocSummary, useUpdateRocFiling, useCreateRocFilingTask, useRequestRocDocuments } from "@/hooks/use-roc";
import { ROC_FORM_TYPE_LABELS, ROC_STATUS_LABELS, ROC_STATUS_VARIANT, type RocFilingStatus } from "@/lib/types/roc";
import { useAuth } from "@/lib/auth-context";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiClientError } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n/language-context";

const STATUS_TABS: { value: RocFilingStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "UPCOMING", label: "Upcoming" },
  { value: "DUE_TODAY", label: "Due Today" },
  { value: "WAITING_FOR_CLIENT", label: "Waiting for Client" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "COMPLETED", label: "Completed" },
  { value: "OVERDUE", label: "Overdue" },
];

export default function RocMcaPage() {
  const { hasPermission } = useAuth();
  const { t } = useLanguage();
  const [status, setStatus] = React.useState<RocFilingStatus | "ALL">("ALL");
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: summary } = useRocSummary();
  const {
    data: filings,
    isLoading,
    isError,
    refetch,
  } = useRocFilings({ status: status === "ALL" ? undefined : status, search: debouncedSearch || undefined });
  const updateFiling = useUpdateRocFiling();
  const createTask = useCreateRocFilingTask();
  const requestDocs = useRequestRocDocuments();

  const canManage = hasPermission("roc.manage");

  const markStatus = async (id: string, status: RocFilingStatus) => {
    try {
      await updateFiling.mutateAsync({ id, status });
      toast.success("Filing updated.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't update this filing.");
    }
  };

  const addTask = async (id: string) => {
    try {
      await createTask.mutateAsync(id);
      toast.success("Task created and linked.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't create a task.");
    }
  };

  const requestDocuments = async (id: string) => {
    try {
      await requestDocs.mutateAsync(id);
      toast.success("Document request created.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't create a document request.");
    }
  };

  if (!hasPermission("roc.view")) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-foreground">{t("pages.rocMca.title")}</h1>
        <EmptyState icon={Building2} title="You don't have access to ROC/MCA." description="Ask a Firm Admin or Manager to grant roc.view if you need this." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("pages.rocMca.title")}</h1>
          <p className="text-sm text-muted">{t("pages.rocMca.description")}</p>
        </div>
        {canManage && <NewRocFilingDialog />}
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard icon={Building2} label="Companies/LLPs" value={summary.totalClients} accent="info" />
          <KpiCard icon={Building2} label="Filings Due" value={summary.returnsDue} accent="attention" />
          <KpiCard icon={Building2} label="Filed" value={summary.returnsCompleted} accent="completed" />
          <KpiCard icon={Building2} label="Overdue" value={summary.overdue} accent="overdue" />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={status} onValueChange={(v) => setStatus(v as RocFilingStatus | "ALL")}>
          <TabsList className="flex-wrap">
            {STATUS_TABS.map((s) => (
              <TabsTrigger key={s.value} value={s.value}>
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input placeholder="Search client, CIN/LLPIN, SRN…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:w-72" />
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}
      {isError && <ErrorState description="We couldn't load ROC filings." onRetry={() => refetch()} />}
      {!isLoading && !isError && filings && filings.items.length === 0 && (
        <EmptyState icon={Building2} title="No filings here." description="Nothing matches this filter right now." />
      )}
      {!isLoading && !isError && filings && filings.items.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>CIN/LLPIN</TableHead>
              <TableHead>Form</TableHead>
              <TableHead>FY</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="w-72" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filings.items.map((filing) => (
              <TableRow key={filing.id}>
                <TableCell className="font-medium text-foreground">{filing.client.displayName}</TableCell>
                <TableCell className="font-mono text-xs text-muted">{filing.client.cinOrLlpin ?? "—"}</TableCell>
                <TableCell className="text-muted">{ROC_FORM_TYPE_LABELS[filing.formType]}</TableCell>
                <TableCell className="text-muted">{filing.financialYear}</TableCell>
                <TableCell className="text-muted">{new Date(filing.dueDate).toLocaleDateString()}</TableCell>
                <TableCell className="text-muted">{filing.assignedUser?.fullName ?? "Unassigned"}</TableCell>
                <TableCell>
                  {canManage ? (
                    <Select value={filing.status} onValueChange={(v) => markStatus(filing.id, v as RocFilingStatus)}>
                      <SelectTrigger className="h-8 w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ROC_STATUS_LABELS) as RocFilingStatus[]).map((s) => (
                          <SelectItem key={s} value={s}>
                            {ROC_STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={ROC_STATUS_VARIANT[filing.status]}>{ROC_STATUS_LABELS[filing.status]}</Badge>
                  )}
                </TableCell>
                {canManage && (
                  <TableCell>
                    <div className="flex gap-1">
                      <UpdateRocFilingDialog filing={filing} />
                      <Button size="icon" variant="ghost" aria-label="Create task" onClick={() => addTask(filing.id)}>
                        <ClipboardList className="h-4 w-4 text-muted" />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label="Request documents" onClick={() => requestDocuments(filing.id)}>
                        <FileUp className="h-4 w-4 text-muted" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
