"use client";

import * as React from "react";
import { Download, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDailyReport, useMonthlyReport, useTeamReport, useComplianceReport, useBillingReport, downloadReportFile } from "@/hooks/use-reports";
import { PRIORITY_MAP, TASK_STATUS_MAP } from "@/lib/status";
import { useLanguage } from "@/lib/i18n/language-context";

export default function ReportsPage() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t("pages.reports.title")}</h1>
        <p className="text-sm text-muted">{t("pages.reports.description")}</p>
      </div>

      <Tabs defaultValue="daily">
        <TabsList className="flex-wrap">
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
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
        <TabsContent value="compliance">
          <ComplianceTab />
        </TabsContent>
        <TabsContent value="billing">
          <BillingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DailyTab() {
  const { data, isLoading } = useDailyReport();

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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadReportFile(`/reports/daily/export.csv`, `daily-report-${data.date}.csv`)}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadReportFile(`/reports/daily/export.pdf`, `daily-report-${data.date}.pdf`)}>
            <Download className="h-4 w-4" /> PDF
          </Button>
        </div>
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
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => downloadReportFile(`/reports/monthly/export.xlsx`, `monthly-report-${data.month}.xlsx`)}>
          <Download className="h-4 w-4" /> Excel
        </Button>
      </div>
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
    </div>
  );
}

function TeamTab() {
  const { data, isLoading } = useTeamReport();
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!data || data.length === 0) return <EmptyState title="No team activity yet." />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => downloadReportFile(`/reports/team/export.xlsx`, `team-report.xlsx`)}>
          <Download className="h-4 w-4" /> Excel
        </Button>
      </div>
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
    </div>
  );
}

function ComplianceTab() {
  const { data, isLoading } = useComplianceReport();
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>GST</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <Row label="Clients tracked" value={data.gst.totalClients} />
          <Row label="Returns due" value={data.gst.returnsDue} />
          <Row label="Completed" value={data.gst.returnsCompleted} />
          <Row label="Overdue" value={data.gst.overdue} accent={data.gst.overdue > 0} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>TDS</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <Row label="Clients tracked" value={data.tds.totalClients} />
          <Row label="Returns due" value={data.tds.returnsDue} />
          <Row label="Completed" value={data.tds.returnsCompleted} />
          <Row label="Overdue" value={data.tds.overdue} accent={data.tds.overdue > 0} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Income Tax (ITR)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <Row label="Clients with PAN" value={data.itr.totalClients} />
          <Row label="Returns due" value={data.itr.returnsDue} />
          <Row label="Filed" value={data.itr.returnsFiled} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>ROC/MCA</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <Row label="Companies/LLPs" value={data.roc.totalClients} />
          <Row label="Filings due" value={data.roc.returnsDue} />
          <Row label="Filed" value={data.roc.returnsCompleted} />
          <Row label="Overdue" value={data.roc.overdue} accent={data.roc.overdue > 0} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>UDIN</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <Row label="Pending" value={data.udin.pending} />
          <Row label="Generated" value={data.udin.generated} />
          <Row label="Verified" value={data.udin.verified} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Notices</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <Row label="New" value={data.notices.new} />
          <Row label="In progress" value={data.notices.underReview + data.notices.drafting + data.notices.waitingForClient} />
          <Row label="Overdue" value={data.notices.overdue} accent={data.notices.overdue > 0} />
        </CardContent>
      </Card>
    </div>
  );
}

function BillingTab() {
  const { data, isLoading } = useBillingReport();
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Active Fee Plans" value={data.activeFeePlans} />
        <Stat label="Outstanding Invoices" value={data.outstandingInvoices} />
        <Stat label="Overdue Invoices" value={data.overdueInvoices} accent="overdue" />
        <Stat label="Collected This Month (₹)" value={data.collectedThisMonth} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Total outstanding</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold text-foreground">₹{data.totalOutstanding.toFixed(2)}</p>
        </CardContent>
      </Card>
      {data.topOverdueInvoices.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.topOverdueInvoices.map((i) => (
              <TableRow key={i.invoiceNumber}>
                <TableCell>{i.invoiceNumber}</TableCell>
                <TableCell className="text-muted">{i.client}</TableCell>
                <TableCell className="text-muted">{new Date(i.dueDate).toLocaleDateString()}</TableCell>
                <TableCell className="text-status-overdue">₹{i.balance}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className={accent ? "font-medium text-status-overdue" : "font-medium text-foreground"}>{value}</span>
    </div>
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
