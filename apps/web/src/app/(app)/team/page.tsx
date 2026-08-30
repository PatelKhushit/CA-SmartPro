"use client";

import * as React from "react";
import { toast } from "sonner";
import { UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { InviteMemberDialog } from "@/components/team/invite-member-dialog";
import { useTeamMembers, useTeamSummary, useTeamRoles, useUpdateMember } from "@/hooks/use-team";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { ApiClientError } from "@/lib/api-client";

const STATUS_VARIANT = { ACTIVE: "completed", INVITED: "attention", SUSPENDED: "overdue" } as const;

export default function TeamPage() {
  const { hasPermission, user: currentUser } = useAuth();
  const { t } = useLanguage();
  const { data: summary } = useTeamSummary();
  const { data: members, isLoading } = useTeamMembers();
  const { data: roles } = useTeamRoles();
  const updateMember = useUpdateMember();

  const canManage = hasPermission("team.manage");

  const changeRole = async (id: string, roleKey: string) => {
    try {
      await updateMember.mutateAsync({ id, roleKey });
      toast.success("Role updated.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't update role.");
    }
  };

  const toggleStatus = async (id: string, status: "ACTIVE" | "SUSPENDED") => {
    try {
      await updateMember.mutateAsync({ id, status });
      toast.success(status === "SUSPENDED" ? "Member suspended." : "Member reactivated.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't update status.");
    }
  };

  if (!canManage) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-foreground">{t("pages.team.title")}</h1>
        <EmptyState icon={UserCog} title="You don't have access to Team." description="Ask a Firm Admin to grant team.manage if you need this." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("pages.team.title")}</h1>
          <p className="text-sm text-muted">{t("pages.team.description")}</p>
        </div>
        <InviteMemberDialog />
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard icon={UserCog} label="Total members" value={summary.total} />
          <KpiCard icon={UserCog} label="Active" value={summary.active} accent="completed" />
          <KpiCard icon={UserCog} label="Pending invites" value={summary.pendingInvitations} accent="attention" />
          <KpiCard icon={UserCog} label="Suspended" value={summary.inactive} accent="overdue" />
        </div>
      )}

      {isLoading && <div className="flex flex-col gap-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>}

      {!isLoading && members && members.length === 0 && (
        <EmptyState icon={UserCog} title="No team members yet." description="Invite your first team member to get started." />
      )}

      {!isLoading && members && members.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Clients</TableHead>
              <TableHead>Workload</TableHead>
              <TableHead>Overdue</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <p className="font-medium text-foreground">{m.fullName}</p>
                  <p className="text-xs text-muted">{m.email}</p>
                </TableCell>
                <TableCell>
                  <Select value={m.role.key} onValueChange={(v) => changeRole(m.id, v)} disabled={m.id === currentUser?.id}>
                    <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {roles?.map((r) => <SelectItem key={r.id} value={r.key}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-muted">{m.assignedClients}</TableCell>
                <TableCell className="w-40">
                  <div className="flex items-center gap-2">
                    <Progress value={m.workload.completionPercent ?? 0} className="w-24" />
                    <span className="text-xs text-muted">{m.workload.completed}/{m.workload.assigned}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {m.workload.overdue > 0 ? <Badge variant="overdue">{m.workload.overdue}</Badge> : <span className="text-muted">0</span>}
                </TableCell>
                <TableCell><Badge variant={STATUS_VARIANT[m.status]}>{m.status}</Badge></TableCell>
                <TableCell>
                  {m.id !== currentUser?.id && m.status !== "INVITED" && (
                    m.status === "SUSPENDED" ? (
                      <button className="text-xs text-brand-700 hover:underline" onClick={() => toggleStatus(m.id, "ACTIVE")}>Reactivate</button>
                    ) : (
                      <button className="text-xs text-status-overdue hover:underline" onClick={() => toggleStatus(m.id, "SUSPENDED")}>Suspend</button>
                    )
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
