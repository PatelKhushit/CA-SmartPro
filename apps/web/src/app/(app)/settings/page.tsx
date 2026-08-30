"use client";

import * as React from "react";
import { toast } from "sonner";
import { ShieldCheck, ExternalLink, History } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NewComplianceRuleDialog } from "@/components/settings/new-compliance-rule-dialog";
import { useComplianceRules, useVerifyComplianceRule, useRetireComplianceRule } from "@/hooks/use-compliance";
import { useAuditLogs } from "@/hooks/use-audit-logs";
import { useAuth } from "@/lib/auth-context";
import { api, ApiClientError } from "@/lib/api-client";
import { SERVICE_CATEGORY_LABELS } from "@/lib/types/client";
import { useLanguage } from "@/lib/i18n/language-context";

const RULE_STATUS_VARIANT = { DRAFT: "upcoming", ACTIVE: "completed", RETIRED: "cancelled" } as const;

export default function SettingsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t("pages.settings.title")}</h1>
        <p className="text-sm text-muted">{user?.organization.name}</p>
      </div>

      <Tabs defaultValue="compliance">
        <TabsList>
          <TabsTrigger value="compliance">Compliance rules</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
          <TabsTrigger value="firm">Firm</TabsTrigger>
        </TabsList>

        <TabsContent value="compliance">
          <ComplianceRulesTab />
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogTab />
        </TabsContent>

        <TabsContent value="firm">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-foreground">{user?.organization.name}</p>
              <p className="text-xs text-muted">Slug: {user?.organization.slug}</p>
              <Badge variant="neutral" className="mt-3">
                Full firm settings (branding, working hours, message templates) — Phase 2
              </Badge>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ComplianceRulesTab() {
  const { data: rules, isLoading, isError, refetch } = useComplianceRules();
  const verify = useVerifyComplianceRule();
  const retire = useRetireComplianceRule();
  const [runningOps, setRunningOps] = React.useState(false);

  const runDailyOpsNow = async () => {
    setRunningOps(true);
    try {
      const result = await api.post<{
        tasks: { tasksCreated: number };
        compliance: { eventsCreated: number };
        reminders: { tasksReminded: number; complianceReminded: number };
      }>("/ops/run-daily-now");
      toast.success(
        `Generated ${result.tasks.tasksCreated} task(s), ${result.compliance.eventsCreated} compliance item(s), and sent ${result.reminders.tasksReminded + result.reminders.complianceReminded} reminder(s).`,
      );
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Daily ops run failed.");
    } finally {
      setRunningOps(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" onClick={runDailyOpsNow} disabled={runningOps}>
          <ShieldCheck className="h-4 w-4" />
          {runningOps ? "Running…" : "Run daily ops now"}
        </Button>
        <NewComplianceRuleDialog />
      </div>

      {isLoading && <Skeleton className="h-32 w-full" />}
      {isError && <ErrorState description="We couldn't load compliance rules." onRetry={() => refetch()} />}

      {!isLoading && !isError && rules && rules.length === 0 && (
        <EmptyState
          icon={ShieldCheck}
          title="No compliance rules configured."
          description="Statutory deadlines are never pre-loaded or guessed — add your firm's rules here, citing the source, then verify and activate them."
        />
      )}

      {!isLoading && !isError && rules && rules.length > 0 && (
        <div className="flex flex-col gap-3">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="flex flex-col gap-2 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{rule.name}</p>
                    <p className="text-xs text-muted">
                      {SERVICE_CATEGORY_LABELS[rule.category as keyof typeof SERVICE_CATEGORY_LABELS]} · Due day{" "}
                      {rule.dueDayOfPeriod} of period
                    </p>
                  </div>
                  <Badge variant={RULE_STATUS_VARIANT[rule.status]}>{rule.status}</Badge>
                </div>
                <p className="flex items-center gap-1 text-xs text-muted">
                  Source: {rule.source}
                  {rule.sourceUrl && (
                    <a href={rule.sourceUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </p>
                {!rule.verifiedAt && (
                  <p className="text-xs text-status-attention">Not yet verified — won&apos;t generate compliance items until verified.</p>
                )}
                <div className="mt-1 flex gap-2">
                  {rule.status === 'DRAFT' && (
                    <Button size="sm" onClick={() => verify.mutate(rule.id)} disabled={verify.isPending}>
                      Mark verified &amp; activate
                    </Button>
                  )}
                  {rule.status === 'ACTIVE' && (
                    <Button size="sm" variant="outline" onClick={() => retire.mutate(rule.id)} disabled={retire.isPending}>
                      Retire
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AuditLogTab() {
  const { data: logs, isLoading, isError, refetch } = useAuditLogs();

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError) return <ErrorState description="We couldn't load the audit log." onRetry={() => refetch()} />;
  if (!logs || logs.length === 0) return <EmptyState icon={History} title="No activity recorded yet." />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Who</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Entity</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell className="text-muted">{new Date(log.createdAt).toLocaleString()}</TableCell>
            <TableCell>{log.user?.fullName ?? "System"}</TableCell>
            <TableCell>
              <Badge variant="neutral">{log.action}</Badge>
            </TableCell>
            <TableCell className="text-muted">{log.entityType ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
