"use client";

import * as React from "react";
import { toast } from "sonner";
import { Workflow, Play, Pause, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { NewAutomationDialog } from "@/components/automations/new-automation-dialog";
import { useAutomationRules, useAutomationExecutions, useSetAutomationEnabled, useRunAutomationsNow } from "@/hooks/use-automations";
import { ACTION_TYPE_LABELS, EXECUTION_STATUS_VARIANT, TRIGGER_TYPE_LABELS } from "@/lib/types/automation";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { ApiClientError } from "@/lib/api-client";

export default function AutomationsPage() {
  const { hasPermission } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = React.useState<"rules" | "log">("rules");

  const { data: rules, isLoading: rulesLoading } = useAutomationRules();
  const { data: executions, isLoading: executionsLoading } = useAutomationExecutions();
  const setEnabled = useSetAutomationEnabled();
  const runNow = useRunAutomationsNow();

  const canManage = hasPermission("automations.manage");

  const toggle = async (id: string, isEnabled: boolean) => {
    try {
      await setEnabled.mutateAsync({ id, isEnabled });
      toast.success(isEnabled ? "Automation enabled." : "Automation paused.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't update this automation.");
    }
  };

  const triggerNow = async () => {
    try {
      const res = await runNow.mutateAsync();
      toast.success(`Evaluated all rules — ${res.executionsCreated} execution(s) created.`);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't run automations.");
    }
  };

  if (!hasPermission("automations.view")) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-foreground">{t("pages.automations.title")}</h1>
        <EmptyState icon={Workflow} title="You don't have access to Automations." description="Ask a Firm Admin to grant automations.view if you need this." />
      </div>
    );
  }

  const enabledCount = rules?.filter((r) => r.isEnabled).length ?? 0;
  const successCount = executions?.filter((e) => e.status === "SUCCESS").length ?? 0;
  const failedCount = executions?.filter((e) => e.status === "FAILED").length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("pages.automations.title")}</h1>
          <p className="text-sm text-muted">
            {t("pages.automations.description")}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={triggerNow} disabled={runNow.isPending}>
              <PlayCircle className="h-4 w-4" /> {runNow.isPending ? "Running…" : "Run now"}
            </Button>
            <NewAutomationDialog />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={Workflow} label="Active rules" value={enabledCount} accent="info" />
        <KpiCard icon={Workflow} label="Total rules" value={rules?.length ?? 0} />
        <KpiCard icon={Workflow} label="Successful runs" value={successCount} accent="completed" />
        <KpiCard icon={Workflow} label="Failed runs" value={failedCount} accent="overdue" />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "rules" | "log")}>
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="log">Execution log</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "rules" && (
        <>
          {rulesLoading && <div className="flex flex-col gap-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>}
          {!rulesLoading && rules && rules.length === 0 && (
            <EmptyState icon={Workflow} title="No automations yet." description="Build a rule to react to overdue tasks, upcoming compliance, or overdue document requests." />
          )}
          {!rulesLoading && rules && rules.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Runs</TableHead>
                  <TableHead>Last run</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="w-24" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <p className="font-medium text-foreground">{rule.name}</p>
                      {rule.description && <p className="text-xs text-muted">{rule.description}</p>}
                    </TableCell>
                    <TableCell className="text-muted">{TRIGGER_TYPE_LABELS[rule.triggerType]}</TableCell>
                    <TableCell className="text-muted">{rule.actions.map((a) => ACTION_TYPE_LABELS[a.type]).join(", ")}</TableCell>
                    <TableCell className="text-muted">{rule._count.executions}</TableCell>
                    <TableCell className="text-muted">{rule.lastRunAt ? new Date(rule.lastRunAt).toLocaleString() : "Never"}</TableCell>
                    <TableCell><Badge variant={rule.isEnabled ? "completed" : "neutral"}>{rule.isEnabled ? "Enabled" : "Paused"}</Badge></TableCell>
                    {canManage && (
                      <TableCell>
                        <Button size="icon" variant="ghost" aria-label={rule.isEnabled ? "Pause" : "Enable"} onClick={() => toggle(rule.id, !rule.isEnabled)}>
                          {rule.isEnabled ? <Pause className="h-4 w-4 text-muted" /> : <Play className="h-4 w-4 text-status-completed" />}
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

      {tab === "log" && (
        <>
          {executionsLoading && <div className="flex flex-col gap-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
          {!executionsLoading && executions && executions.length === 0 && (
            <EmptyState icon={Workflow} title="No executions yet." description="Once a rule fires, its runs will show up here." />
          )}
          {!executionsLoading && executions && executions.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Triggered</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions.map((exec) => (
                  <TableRow key={exec.id}>
                    <TableCell className="font-medium text-foreground">{exec.automationRule.name}</TableCell>
                    <TableCell className="text-muted">{exec.triggerEntityType}</TableCell>
                    <TableCell className="text-muted">{exec.clientName ?? "—"}</TableCell>
                    <TableCell><Badge variant={EXECUTION_STATUS_VARIANT[exec.status]}>{exec.status}</Badge></TableCell>
                    <TableCell className="text-muted">{new Date(exec.triggeredAt).toLocaleString()}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted">
                      {exec.error ?? exec.actionsSummary.map((a) => `${a.type}: ${a.status}`).join(", ")}
                    </TableCell>
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
