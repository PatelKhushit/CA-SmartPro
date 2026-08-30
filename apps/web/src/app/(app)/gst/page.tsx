"use client";

import * as React from "react";
import { toast } from "sonner";
import { Percent, ClipboardList, FileUp } from "lucide-react";
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
import { NewGstProfileDialog } from "@/components/gst/new-gst-profile-dialog";
import { NewGstReturnDialog } from "@/components/gst/new-gst-return-dialog";
import { useGstProfiles, useGstReturns, useGstSummary, useUpdateGstReturn, useCreateGstReturnTask, useRequestGstDocuments } from "@/hooks/use-gst";
import { GST_RETURN_TYPE_LABELS, WORK_STATUS_LABELS, WORK_STATUS_VARIANT, type ComplianceWorkStatus } from "@/lib/types/gst";
import { useAuth } from "@/lib/auth-context";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiClientError } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n/language-context";

const STATUS_TABS: { value: ComplianceWorkStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "UPCOMING", label: "Upcoming" },
  { value: "DUE_TODAY", label: "Due Today" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "WAITING_FOR_CLIENT", label: "Waiting for Client" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "COMPLETED", label: "Completed" },
];

export default function GstPage() {
  const { hasPermission } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = React.useState<"returns" | "profiles">("returns");
  const [status, setStatus] = React.useState<ComplianceWorkStatus | "ALL">("ALL");
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: summary } = useGstSummary();
  const { data: returns, isLoading: returnsLoading, isError: returnsError, refetch: refetchReturns } = useGstReturns({
    status: status === "ALL" ? undefined : status,
    search: debouncedSearch || undefined,
  });
  const { data: profiles, isLoading: profilesLoading, isError: profilesError, refetch: refetchProfiles } = useGstProfiles();
  const updateReturn = useUpdateGstReturn();
  const createTask = useCreateGstReturnTask();
  const requestDocs = useRequestGstDocuments();

  const canManage = hasPermission("gst.manage");

  const markStatus = async (id: string, status: ComplianceWorkStatus) => {
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

  if (!hasPermission("gst.view")) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-foreground">{t("pages.gst.title")}</h1>
        <EmptyState icon={Percent} title="You don't have access to GST." description="Ask a Firm Admin or Manager to grant gst.view if you need this." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("pages.gst.title")}</h1>
          <p className="text-sm text-muted">{t("pages.gst.description")}</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <NewGstProfileDialog />
            <NewGstReturnDialog />
          </div>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard icon={Percent} label="Returns Due" value={summary.returnsDue} accent="attention" />
          <KpiCard icon={Percent} label="Overdue" value={summary.overdue} accent="overdue" />
          <KpiCard icon={Percent} label="Completed" value={summary.returnsCompleted} accent="completed" />
          <KpiCard icon={Percent} label="Pending Documents" value={summary.pendingDocuments} accent="info" />
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as "returns" | "profiles")}>
        <TabsList>
          <TabsTrigger value="returns">Returns</TabsTrigger>
          <TabsTrigger value="profiles">GSTINs {profiles ? `(${profiles.length})` : ""}</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "returns" && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={status} onValueChange={(v) => setStatus(v as ComplianceWorkStatus | "ALL")}>
              <TabsList className="flex-wrap">
                {STATUS_TABS.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
              </TabsList>
            </Tabs>
            <Input placeholder="Search client, period…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:w-72" />
          </div>

          {returnsLoading && (
            <div className="flex flex-col gap-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          )}
          {returnsError && <ErrorState description="We couldn't load GST returns." onRetry={() => refetchReturns()} />}
          {!returnsLoading && !returnsError && returns && returns.items.length === 0 && (
            <EmptyState icon={Percent} title="No returns here." description="Nothing matches this filter right now." />
          )}
          {!returnsLoading && !returnsError && returns && returns.items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Return</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="w-56" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.items.map((ret) => (
                  <TableRow key={ret.id}>
                    <TableCell className="font-medium text-foreground">{ret.client.displayName}</TableCell>
                    <TableCell className="text-muted">{GST_RETURN_TYPE_LABELS[ret.returnType]}</TableCell>
                    <TableCell className="text-muted">{ret.taxPeriod}</TableCell>
                    <TableCell className="text-muted">{new Date(ret.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-muted">{ret.assignedUser?.fullName ?? "Unassigned"}</TableCell>
                    <TableCell>
                      {canManage ? (
                        <Select value={ret.status} onValueChange={(v) => markStatus(ret.id, v as ComplianceWorkStatus)}>
                          <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.keys(WORK_STATUS_LABELS) as ComplianceWorkStatus[]).map((s) => (
                              <SelectItem key={s} value={s}>{WORK_STATUS_LABELS[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={WORK_STATUS_VARIANT[ret.status]}>{WORK_STATUS_LABELS[ret.status]}</Badge>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex gap-1">
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
        </>
      )}

      {tab === "profiles" && (
        <>
          {profilesLoading && (
            <div className="flex flex-col gap-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          )}
          {profilesError && <ErrorState description="We couldn't load GST profiles." onRetry={() => refetchProfiles()} />}
          {!profilesLoading && !profilesError && profiles && profiles.length === 0 && (
            <EmptyState icon={Percent} title="No GSTINs added yet." description="Add a client's GST registration to start tracking returns." />
          )}
          {!profilesLoading && !profilesError && profiles && profiles.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>Trade name</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Returns tracked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-foreground">{p.client.displayName}</TableCell>
                    <TableCell className="font-mono text-xs">{p.gstin}</TableCell>
                    <TableCell className="text-muted">{p.tradeName ?? "—"}</TableCell>
                    <TableCell className="text-muted">{p.state ?? "—"}</TableCell>
                    <TableCell className="text-muted">{p._count?.returns ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}
    </div>
  );
}
