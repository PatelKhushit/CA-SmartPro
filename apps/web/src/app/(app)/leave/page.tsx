"use client";

import * as React from "react";
import { toast } from "sonner";
import { CalendarDays, CalendarClock, CalendarCheck, Users, Check, X, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { NewLeaveRequestDialog } from "@/components/leave/new-leave-request-dialog";
import { useLeaveSummary, useLeaveRequests, useCancelLeaveRequest, useApproveLeaveRequest, useRejectLeaveRequest } from "@/hooks/use-leave";
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS, LEAVE_STATUS_VARIANT, type LeaveRequestStatus } from "@/lib/types/leave";
import { useAuth } from "@/lib/auth-context";
import { ApiClientError } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n/language-context";

const STATUS_TABS: { value: LeaveRequestStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function LeavePage() {
  const { hasPermission, user } = useAuth();
  const { t } = useLanguage();
  const [status, setStatus] = React.useState<LeaveRequestStatus | "ALL">("ALL");

  const canManage = hasPermission("leave.manage");
  const { data: summary } = useLeaveSummary();
  const {
    data: requests,
    isLoading,
    isError,
    refetch,
  } = useLeaveRequests({ status: status === "ALL" ? undefined : status });
  const cancelRequest = useCancelLeaveRequest();
  const approveRequest = useApproveLeaveRequest();
  const rejectRequest = useRejectLeaveRequest();

  if (!hasPermission("leave.view")) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-foreground">{t("pages.leave.title")}</h1>
        <EmptyState icon={CalendarDays} title="You don't have access to Leave." description="Ask a Firm Admin or Manager to grant leave.view if you need this." />
      </div>
    );
  }

  const doCancel = async (id: string) => {
    try {
      await cancelRequest.mutateAsync(id);
      toast.success("Leave request cancelled.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't cancel this request.");
    }
  };
  const doApprove = async (id: string) => {
    try {
      await approveRequest.mutateAsync({ id });
      toast.success("Leave approved.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't approve this request.");
    }
  };
  const doReject = async (id: string) => {
    try {
      await rejectRequest.mutateAsync({ id });
      toast.success("Leave rejected.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't reject this request.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("pages.leave.title")}</h1>
          <p className="text-sm text-muted">{t("pages.leave.description")}</p>
        </div>
        <NewLeaveRequestDialog />
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard icon={CalendarClock} label="My Pending" value={summary.myRequests.pending} accent="attention" />
          <KpiCard icon={CalendarCheck} label="Days Taken This Year" value={summary.myRequests.daysTakenThisYear} accent="completed" />
          <KpiCard icon={CalendarDays} label="My Approved" value={summary.myRequests.approved} accent="info" />
          {canManage && <KpiCard icon={Users} label="Awaiting My Approval" value={summary.team.pendingApprovals} accent="attention" />}
        </div>
      )}

      <Tabs value={status} onValueChange={(v) => setStatus(v as LeaveRequestStatus | "ALL")}>
        <TabsList className="flex-wrap">
          {STATUS_TABS.map((s) => (
            <TabsTrigger key={s.value} value={s.value}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}
      {isError && <ErrorState description="We couldn't load leave requests." onRetry={() => refetch()} />}
      {!isLoading && !isError && requests && requests.items.length === 0 && (
        <EmptyState icon={CalendarDays} title="No leave requests here." description="Nothing matches this filter right now." />
      )}
      {!isLoading && !isError && requests && requests.items.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              {canManage && <TableHead>Team Member</TableHead>}
              <TableHead>Type</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.items.map((r) => (
              <TableRow key={r.id}>
                {canManage && <TableCell className="font-medium text-foreground">{r.user.fullName}</TableCell>}
                <TableCell className="text-muted">{LEAVE_TYPE_LABELS[r.leaveType]}</TableCell>
                <TableCell className="text-muted">
                  {new Date(r.startDate).toLocaleDateString()}
                  {r.startDate !== r.endDate ? ` – ${new Date(r.endDate).toLocaleDateString()}` : ""}
                </TableCell>
                <TableCell className="text-muted">{r.days}</TableCell>
                <TableCell className="max-w-56 truncate text-muted">{r.reason ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={LEAVE_STATUS_VARIANT[r.status]}>{LEAVE_STATUS_LABELS[r.status]}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {r.status === "PENDING" && canManage && (
                      <>
                        <Button size="icon" variant="ghost" aria-label="Approve" onClick={() => doApprove(r.id)}>
                          <Check className="h-4 w-4 text-status-completed" />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label="Reject" onClick={() => doReject(r.id)}>
                          <X className="h-4 w-4 text-status-overdue" />
                        </Button>
                      </>
                    )}
                    {r.status === "PENDING" && (r.userId === user?.id || canManage) && (
                      <Button size="icon" variant="ghost" aria-label="Cancel" onClick={() => doCancel(r.id)}>
                        <Ban className="h-4 w-4 text-muted" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
