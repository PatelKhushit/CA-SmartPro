"use client";

import * as React from "react";
import { toast } from "sonner";
import { Landmark, ClipboardList, FileUp } from "lucide-react";
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
import { NewItrReturnDialog } from "@/components/itr/new-itr-return-dialog";
import { UpdateItrReturnDialog } from "@/components/itr/update-itr-return-dialog";
import { useItrReturns, useItrSummary, useUpdateItrReturn, useCreateItrReturnTask, useRequestItrDocuments } from "@/hooks/use-itr";
import { ITR_FORM_TYPE_LABELS, ITR_STATUS_LABELS, ITR_STATUS_VARIANT, type ItrReturnStatus } from "@/lib/types/itr";
import { useAuth } from "@/lib/auth-context";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiClientError } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n/language-context";

const STATUS_TABS: { value: ItrReturnStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "DATA_COLLECTION", label: "Data Collection" },
  { value: "PREPARATION", label: "Preparation" },
  { value: "REVIEW", label: "Review" },
  { value: "CLIENT_APPROVAL", label: "Client Approval" },
  { value: "FILED", label: "Filed" },
  { value: "COMPLETED", label: "Completed" },
];

export default function IncomeTaxPage() {
  const { hasPermission } = useAuth();
  const { t } = useLanguage();
  const [status, setStatus] = React.useState<ItrReturnStatus | "ALL">("ALL");
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: summary } = useItrSummary();
  const {
    data: returns,
    isLoading,
    isError,
    refetch,
  } = useItrReturns({ status: status === "ALL" ? undefined : status, search: debouncedSearch || undefined });
  const updateReturn = useUpdateItrReturn();
  const createTask = useCreateItrReturnTask();
  const requestDocs = useRequestItrDocuments();

  const canManage = hasPermission("itr.manage");

  const markStatus = async (id: string, status: ItrReturnStatus) => {
    try {
      await updateReturn.mutateAsync({ id, status });
      toast.success("Return updated.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't update this return.");
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

  if (!hasPermission("itr.view")) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-foreground">{t("pages.incomeTax.title")}</h1>
        <EmptyState icon={Landmark} title="You don't have access to Income Tax." description="Ask a Firm Admin or Manager to grant itr.view if you need this." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("pages.incomeTax.title")}</h1>
          <p className="text-sm text-muted">{t("pages.incomeTax.description")}</p>
        </div>
        {canManage && <NewItrReturnDialog />}
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard icon={Landmark} label="Clients with PAN" value={summary.totalClients} accent="info" />
          <KpiCard icon={Landmark} label="Returns Due" value={summary.returnsDue} accent="attention" />
          <KpiCard icon={Landmark} label="Filed" value={summary.returnsFiled} accent="completed" />
          <KpiCard icon={Landmark} label="Pending Documents" value={summary.pendingDocuments} accent="info" />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={status} onValueChange={(v) => setStatus(v as ItrReturnStatus | "ALL")}>
          <TabsList className="flex-wrap">
            {STATUS_TABS.map((s) => (
              <TabsTrigger key={s.value} value={s.value}>
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input placeholder="Search client, PAN, ack. no…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:w-72" />
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}
      {isError && <ErrorState description="We couldn't load ITR returns." onRetry={() => refetch()} />}
      {!isLoading && !isError && returns && returns.items.length === 0 && (
        <EmptyState icon={Landmark} title="No returns here." description="Nothing matches this filter right now." />
      )}
      {!isLoading && !isError && returns && returns.items.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>PAN</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>AY</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="w-72" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {returns.items.map((ret) => (
              <TableRow key={ret.id}>
                <TableCell className="font-medium text-foreground">{ret.client.displayName}</TableCell>
                <TableCell className="font-mono text-xs text-muted">{ret.client.pan ?? "—"}</TableCell>
                <TableCell className="text-muted">{ITR_FORM_TYPE_LABELS[ret.formType]}</TableCell>
                <TableCell className="text-muted">{ret.assessmentYear}</TableCell>
                <TableCell className="text-muted">{new Date(ret.dueDate).toLocaleDateString()}</TableCell>
                <TableCell className="text-muted">{ret.assignedUser?.fullName ?? "Unassigned"}</TableCell>
                <TableCell>
                  {canManage ? (
                    <Select value={ret.status} onValueChange={(v) => markStatus(ret.id, v as ItrReturnStatus)}>
                      <SelectTrigger className="h-8 w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ITR_STATUS_LABELS) as ItrReturnStatus[]).map((s) => (
                          <SelectItem key={s} value={s}>
                            {ITR_STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={ITR_STATUS_VARIANT[ret.status]}>{ITR_STATUS_LABELS[ret.status]}</Badge>
                  )}
                </TableCell>
                {canManage && (
                  <TableCell>
                    <div className="flex gap-1">
                      <UpdateItrReturnDialog itrReturn={ret} />
                      <Button size="icon" variant="ghost" aria-label="Create task" onClick={() => addTask(ret.id)}>
                        <ClipboardList className="h-4 w-4 text-muted" />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label="Request documents" onClick={() => requestDocuments(ret.id)}>
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
