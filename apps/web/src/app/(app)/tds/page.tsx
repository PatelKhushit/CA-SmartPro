"use client";

import * as React from "react";
import { toast } from "sonner";
import { Percent, ClipboardList } from "lucide-react";
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
import { NewTdsProfileDialog } from "@/components/tds/new-tds-profile-dialog";
import { NewTdsReturnDialog } from "@/components/tds/new-tds-return-dialog";
import { NewTdsChallanDialog } from "@/components/tds/new-tds-challan-dialog";
import { NewTdsCertificateDialog } from "@/components/tds/new-tds-certificate-dialog";
import {
  useTdsProfiles, useTdsReturns, useTdsSummary, useUpdateTdsReturn, useCreateTdsReturnTask,
  useTdsChallans, useUpdateTdsChallan, useTdsCertificates, useUpdateTdsCertificate,
} from "@/hooks/use-tds";
import { WORK_STATUS_LABELS, WORK_STATUS_VARIANT, type ComplianceWorkStatus } from "@/lib/types/gst";
import { TDS_RETURN_TYPE_LABELS, TDS_CERT_TYPE_LABELS } from "@/lib/types/tds";
import { useAuth } from "@/lib/auth-context";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiClientError } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n/language-context";

const STATUS_TABS: { value: ComplianceWorkStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "UPCOMING", label: "Upcoming" },
  { value: "DUE_TODAY", label: "Due Today" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "COMPLETED", label: "Completed" },
];

export default function TdsPage() {
  const { hasPermission } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = React.useState<"returns" | "challans" | "certificates" | "profiles">("returns");
  const [status, setStatus] = React.useState<ComplianceWorkStatus | "ALL">("ALL");
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: summary } = useTdsSummary();
  const { data: returns, isLoading: returnsLoading, isError: returnsError, refetch: refetchReturns } = useTdsReturns({
    status: status === "ALL" ? undefined : status,
    search: debouncedSearch || undefined,
  });
  const { data: profiles, isLoading: profilesLoading } = useTdsProfiles();
  const { data: challans, isLoading: challansLoading } = useTdsChallans();
  const { data: certificates, isLoading: certificatesLoading } = useTdsCertificates();

  const updateReturn = useUpdateTdsReturn();
  const createTask = useCreateTdsReturnTask();
  const updateChallan = useUpdateTdsChallan();
  const updateCertificate = useUpdateTdsCertificate();

  const canManage = hasPermission("tds.manage");

  const markReturnStatus = async (id: string, status: ComplianceWorkStatus) => {
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

  const markChallanPaid = async (id: string) => {
    try {
      await updateChallan.mutateAsync({ id, status: "PAID" });
      toast.success("Challan marked paid.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't update this challan.");
    }
  };

  const markCertificateIssued = async (id: string) => {
    try {
      await updateCertificate.mutateAsync({ id, status: "ISSUED" });
      toast.success("Certificate marked issued.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't update this certificate.");
    }
  };

  if (!hasPermission("tds.view")) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-foreground">{t("pages.tds.title")}</h1>
        <EmptyState icon={Percent} title="You don't have access to TDS." description="Ask a Firm Admin or Manager to grant tds.view if you need this." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("pages.tds.title")}</h1>
          <p className="text-sm text-muted">{t("pages.tds.description")}</p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <NewTdsProfileDialog />
            <NewTdsChallanDialog />
            <NewTdsCertificateDialog />
            <NewTdsReturnDialog />
          </div>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <KpiCard icon={Percent} label="Returns Due" value={summary.returnsDue} accent="attention" />
          <KpiCard icon={Percent} label="Overdue" value={summary.overdue} accent="overdue" />
          <KpiCard icon={Percent} label="Completed" value={summary.returnsCompleted} accent="completed" />
          <KpiCard icon={Percent} label="Challans Pending" value={summary.challansPending} accent="info" />
          <KpiCard icon={Percent} label="Certs Pending" value={summary.certificatesPending} accent="info" />
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="returns">Returns</TabsTrigger>
          <TabsTrigger value="challans">Challans</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
          <TabsTrigger value="profiles">TANs {profiles ? `(${profiles.length})` : ""}</TabsTrigger>
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
            <Input placeholder="Search client, quarter…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:w-72" />
          </div>
          {returnsLoading && <div className="flex flex-col gap-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
          {returnsError && <ErrorState description="We couldn't load TDS returns." onRetry={() => refetchReturns()} />}
          {!returnsLoading && !returnsError && returns && returns.items.length === 0 && (
            <EmptyState icon={Percent} title="No returns here." description="Nothing matches this filter right now." />
          )}
          {!returnsLoading && !returnsError && returns && returns.items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Return</TableHead>
                  <TableHead>Quarter</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="w-28" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.items.map((ret) => (
                  <TableRow key={ret.id}>
                    <TableCell className="font-medium text-foreground">{ret.client.displayName}</TableCell>
                    <TableCell className="text-muted">{TDS_RETURN_TYPE_LABELS[ret.returnType]}</TableCell>
                    <TableCell className="text-muted">{ret.quarter}</TableCell>
                    <TableCell className="text-muted">{new Date(ret.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-muted">{ret.assignedUser?.fullName ?? "Unassigned"}</TableCell>
                    <TableCell>
                      {canManage ? (
                        <Select value={ret.status} onValueChange={(v) => markReturnStatus(ret.id, v as ComplianceWorkStatus)}>
                          <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.keys(WORK_STATUS_LABELS) as ComplianceWorkStatus[]).map((s) => <SelectItem key={s} value={s}>{WORK_STATUS_LABELS[s]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={WORK_STATUS_VARIANT[ret.status]}>{WORK_STATUS_LABELS[ret.status]}</Badge>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <Button size="icon" variant="ghost" aria-label="Create task" onClick={() => addTask(ret.id)}>
                          <ClipboardList className="h-4 w-4 text-muted" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}

      {tab === "challans" && (
        <>
          {challansLoading && <div className="flex flex-col gap-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
          {!challansLoading && challans && challans.length === 0 && (
            <EmptyState icon={Percent} title="No challans recorded." description="Record a TDS payment challan to track it here." />
          )}
          {!challansLoading && challans && challans.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Challan No.</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Payment date</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="w-28" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {challans.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-foreground">{c.client.displayName}</TableCell>
                    <TableCell className="font-mono text-xs">{c.challanNumber}</TableCell>
                    <TableCell className="text-muted">₹{Number(c.amount).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-muted">{c.section ?? "—"}</TableCell>
                    <TableCell className="text-muted">{c.paymentDate ? new Date(c.paymentDate).toLocaleDateString() : "—"}</TableCell>
                    <TableCell><Badge variant={c.status === "PAID" ? "completed" : "attention"}>{c.status}</Badge></TableCell>
                    {canManage && (
                      <TableCell>
                        {c.status === "PENDING" && <Button size="sm" variant="outline" onClick={() => markChallanPaid(c.id)}>Mark paid</Button>}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}

      {tab === "certificates" && (
        <>
          {certificatesLoading && <div className="flex flex-col gap-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
          {!certificatesLoading && certificates && certificates.length === 0 && (
            <EmptyState icon={Percent} title="No certificates tracked." description="Add a Form 16 / 16A / 27D to track issuance." />
          )}
          {!certificatesLoading && certificates && certificates.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Certificate</TableHead>
                  <TableHead>Quarter</TableHead>
                  <TableHead>Issued date</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="w-28" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificates.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-foreground">{c.client.displayName}</TableCell>
                    <TableCell className="text-muted">{TDS_CERT_TYPE_LABELS[c.certificateType]}</TableCell>
                    <TableCell className="text-muted">{c.quarter}</TableCell>
                    <TableCell className="text-muted">{c.issuedDate ? new Date(c.issuedDate).toLocaleDateString() : "—"}</TableCell>
                    <TableCell><Badge variant={c.status === "ISSUED" ? "completed" : "attention"}>{c.status}</Badge></TableCell>
                    {canManage && (
                      <TableCell>
                        {c.status === "PENDING" && <Button size="sm" variant="outline" onClick={() => markCertificateIssued(c.id)}>Mark issued</Button>}
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
          {profilesLoading && <div className="flex flex-col gap-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
          {!profilesLoading && profiles && profiles.length === 0 && (
            <EmptyState icon={Percent} title="No TANs added yet." description="Add a client's TDS deductor TAN to start tracking returns." />
          )}
          {!profilesLoading && profiles && profiles.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>TAN</TableHead>
                  <TableHead>Deductor type</TableHead>
                  <TableHead>Returns</TableHead>
                  <TableHead>Challans</TableHead>
                  <TableHead>Certificates</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-foreground">{p.client.displayName}</TableCell>
                    <TableCell className="font-mono text-xs">{p.tan}</TableCell>
                    <TableCell className="text-muted">{p.deductorType ?? "—"}</TableCell>
                    <TableCell className="text-muted">{p._count?.returns ?? 0}</TableCell>
                    <TableCell className="text-muted">{p._count?.challans ?? 0}</TableCell>
                    <TableCell className="text-muted">{p._count?.certificates ?? 0}</TableCell>
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
