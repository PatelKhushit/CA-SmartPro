"use client";

import * as React from "react";
import { toast } from "sonner";
import { Clock, LogIn, LogOut, Users, CalendarCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MarkAttendanceDialog } from "@/components/attendance/mark-attendance-dialog";
import { useAttendanceSummary, useAttendanceRecords, useCheckIn, useCheckOut } from "@/hooks/use-attendance";
import { useTeamMembers } from "@/hooks/use-team";
import { ATTENDANCE_STATUS_LABELS, ATTENDANCE_STATUS_VARIANT, formatWorkedMinutes } from "@/lib/types/attendance";
import { useAuth } from "@/lib/auth-context";
import { ApiClientError } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n/language-context";

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function AttendancePage() {
  const { hasPermission, user } = useAuth();
  const { t } = useLanguage();
  const [month, setMonth] = React.useState(currentMonth());
  const [userId, setUserId] = React.useState<string>("");

  const canManage = hasPermission("attendance.manage");
  const { data: members } = useTeamMembers({ enabled: canManage && hasPermission("team.manage") });

  const { data: summary } = useAttendanceSummary();
  const {
    data: records,
    isLoading,
    isError,
    refetch,
  } = useAttendanceRecords({ month, userId: canManage ? userId || undefined : user?.id });
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  if (!hasPermission("attendance.view")) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-foreground">{t("pages.attendance.title")}</h1>
        <EmptyState icon={Clock} title="You don't have access to Attendance." description="Ask a Firm Admin or Manager to grant attendance.view if you need this." />
      </div>
    );
  }

  const doCheckIn = async () => {
    try {
      await checkIn.mutateAsync();
      toast.success("Checked in.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't check in.");
    }
  };
  const doCheckOut = async () => {
    try {
      await checkOut.mutateAsync();
      toast.success("Checked out.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't check out.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("pages.attendance.title")}</h1>
          <p className="text-sm text-muted">{t("pages.attendance.description")}</p>
        </div>
        {canManage && <MarkAttendanceDialog />}
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-5">
          <div>
            <p className="text-sm text-muted">Today</p>
            {summary?.today.status ? (
              <div className="flex items-center gap-2">
                <Badge variant={ATTENDANCE_STATUS_VARIANT[summary.today.status]}>{ATTENDANCE_STATUS_LABELS[summary.today.status]}</Badge>
                {summary.today.checkInAt && (
                  <span className="text-sm text-muted">
                    In: {new Date(summary.today.checkInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                {summary.today.checkOutAt && (
                  <span className="text-sm text-muted">
                    Out: {new Date(summary.today.checkOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-lg font-semibold text-foreground">Not checked in yet</p>
            )}
          </div>
          <div className="flex gap-2">
            {!summary?.today.checkedIn && (
              <Button disabled={checkIn.isPending} onClick={doCheckIn}>
                <LogIn className="h-4 w-4" /> Check in
              </Button>
            )}
            {summary?.today.checkedIn && !summary.today.checkedOut && (
              <Button variant="outline" disabled={checkOut.isPending} onClick={doCheckOut}>
                <LogOut className="h-4 w-4" /> Check out
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard icon={CalendarCheck} label="Present This Month" value={summary.thisMonth.present} accent="completed" />
          <KpiCard icon={Clock} label="On Leave This Month" value={summary.thisMonth.onLeave} accent="info" />
          <KpiCard icon={Clock} label="Absent This Month" value={summary.thisMonth.absent} accent="overdue" />
          <KpiCard icon={Users} label="Present Today (Team)" value={summary.team.presentToday} accent="info" />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 6 }).map((_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                const label = d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
                return (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {canManage && (
            <Select value={userId || "ALL"} onValueChange={(v) => setUserId(v === "ALL" ? "" : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All team members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All team members</SelectItem>
                {members?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}
      {isError && <ErrorState description="We couldn't load attendance records." onRetry={() => refetch()} />}
      {!isLoading && !isError && records && records.items.length === 0 && (
        <EmptyState icon={Clock} title="No attendance records yet." description="Check in to start your attendance record for this month." />
      )}
      {!isLoading && !isError && records && records.items.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              {canManage && <TableHead>Team Member</TableHead>}
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Check-out</TableHead>
              <TableHead>Worked</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.items.map((r) => (
              <TableRow key={r.id}>
                {canManage && <TableCell className="font-medium text-foreground">{r.user.fullName}</TableCell>}
                <TableCell className="text-muted">{new Date(r.date).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant={ATTENDANCE_STATUS_VARIANT[r.status]}>{ATTENDANCE_STATUS_LABELS[r.status]}</Badge>
                </TableCell>
                <TableCell className="text-muted">{r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</TableCell>
                <TableCell className="text-muted">{r.checkOutAt ? new Date(r.checkOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</TableCell>
                <TableCell className="text-muted">{formatWorkedMinutes(r.workedMinutes)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
