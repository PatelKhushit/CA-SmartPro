"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDailyReport, useMonthlyReport, useTeamReport } from "@/hooks/use-reports";
import { PRIORITY_MAP, TASK_STATUS_MAP } from "@/lib/status";
import { getAccessToken } from "@/lib/api-client";
import { FileText } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
        <p className="text-sm text-muted">Productivity, compliance health, and team workload — computed live, never stale.</p>
      </div>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <DailyTab />
        </TabsContent>
        <TabsContent value="monthly">
          <MonthlyTab />
        </TabsContent>
        <TabsContent value="team">
          <TeamTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DailyTab() {
  const { data, isLoading } = useDailyReport();

  const downloadCsv = async () => {
    const token = getAccessToken();
    const res = await fetch(`${API_BASE_URL}/reports/daily/export.csv`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: "include",
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-report-${data?.date ?? "today"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Completed" value={data.completed} />
          <Stat label="Pending" value={data.pending} />
          <Stat label="Overdue" value={data.overdue} accent="overdue" />
          <Stat label="Follow-ups" value={data.followUps} />
        </div>
        <Button variant="outline" size="sm" onClick={downloadCsv}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {data.tasks.length === 0 ? (
        <EmptyState icon={FileText} title="No task activity for this day." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Assigned to</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.tasks.map((t, i) => (
              <TableRow key={i}>
                <TableCell>{t.title}</TableCell>
                <TableCell className="text-muted">{t.client?.displayName ?? "Internal"}</TableCell>
                <TableCell className="text-muted">{t.assignedUser?.fullName ?? "Unassigned"}</TableCell>
                <TableCell>
                  <Badge variant={PRIORITY_MAP[t.priority].variant}>{PRIORITY_MAP[t.priority].label}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={(TASK_STATUS_MAP[t.status] ?? TASK_STATUS_MAP.PENDING).variant}>
                    {(TASK_STATUS_MAP[t.status] ?? TASK_STATUS_MAP.PENDING).label}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function MonthlyTab() {
  const { data, isLoading } = useMonthlyReport();
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!data) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Productivity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-semibold text-foreground">{data.productivityPercent}%</p>
          <p className="text-sm text-muted">
            {data.tasksCompleted} of {data.tasksTotal} tasks completed in {data.month}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Compliance health</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-semibold text-foreground">{data.complianceHealthPercent}%</p>
          <p className="text-sm text-muted">
            {data.complianceCompleted} of {data.complianceTotal} compliance items completed
          </p>
        </CardContent>
      </Card>
      <Card className="sm:col-span-2">
        <CardHeader>
          <CardTitle>Client activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold text-foreground">{data.activeClients}</p>
          <p className="text-sm text-muted">Active clients this month</p>
        </CardContent>
      </Card>
    </div>
  );
}

function TeamTab() {
  const { data, isLoading } = useTeamReport();
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!data || data.length === 0) return <EmptyState title="No team activity yet." />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Team member</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Assigned</TableHead>
          <TableHead>Completed</TableHead>
          <TableHead>Overdue</TableHead>
          <TableHead>Completion rate</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.userId}>
            <TableCell>{row.fullName}</TableCell>
            <TableCell className="text-muted">{row.role}</TableCell>
            <TableCell>{row.assigned}</TableCell>
            <TableCell>{row.completed}</TableCell>
            <TableCell className={row.overdue > 0 ? "text-status-overdue" : "text-muted"}>{row.overdue}</TableCell>
            <TableCell>{row.completionRate}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "overdue" }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className={accent === "overdue" && value > 0 ? "text-2xl font-semibold text-status-overdue" : "text-2xl font-semibold text-foreground"}>
        {value}
      </p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
