"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Sparkles, ListChecks } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NewTaskDialog } from "@/components/tasks/new-task-dialog";
import { NewTemplateDialog } from "@/components/tasks/new-template-dialog";
import { useTasks, useTaskTemplates, useDeactivateTaskTemplate, useGenerateTasksNow } from "@/hooks/use-tasks";
import { PRIORITY_MAP, effectiveTaskStatus } from "@/lib/status";
import { TASK_FREQUENCY_LABELS } from "@/lib/types/task";
import { ApiClientError } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n/language-context";

function formatDueDate(dueDate: string | null) {
  if (!dueDate) return "No due date";
  return new Date(dueDate).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function TasksPage() {
  const { t } = useLanguage();
  const [status, setStatus] = React.useState<string>("");
  const { data, isLoading, isError, refetch } = useTasks({ status: status || undefined, pageSize: 50 });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t("pages.tasks.title")}</h1>
        <p className="text-sm text-muted">{t("pages.tasks.description")}</p>
      </div>

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="templates">Recurring templates</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Select value={status || "ALL"} onValueChange={(v) => setStatus(v === "ALL" ? "" : v)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                <SelectItem value="BLOCKED">Blocked</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <NewTaskDialog />
          </div>

          {isLoading && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}

          {isError && (
            <ErrorState description="We couldn't load your tasks. Please check your connection and try again." onRetry={() => refetch()} />
          )}

          {!isLoading && !isError && data && data.items.length === 0 && (
            <EmptyState
              icon={ListChecks}
              title="No tasks yet."
              description="Create a one-off task, or set up a recurring template so tasks generate automatically."
              action={<NewTaskDialog />}
            />
          )}

          {!isLoading && !isError && data && data.items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Assigned to</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((task) => {
                  const statusInfo = effectiveTaskStatus(task.dueDate, task.status);
                  const priorityInfo = PRIORITY_MAP[task.priority];
                  return (
                    <TableRow key={task.id}>
                      <TableCell>
                        <Link href={`/tasks/${task.id}`} className="font-medium text-brand-700 hover:underline">
                          {task.title}
                        </Link>
                        {task.checklistItems.length > 0 && (
                          <p className="text-xs text-muted">
                            {task.checklistItems.filter((c) => c.isDone).length}/{task.checklistItems.length} steps
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-muted">{task.client?.displayName ?? "Internal"}</TableCell>
                      <TableCell>
                        <Badge variant={priorityInfo.variant}>{priorityInfo.label}</Badge>
                      </TableCell>
                      <TableCell className="text-muted">{formatDueDate(task.dueDate)}</TableCell>
                      <TableCell className="text-muted">{task.assignedUser?.fullName ?? "Unassigned"}</TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TemplatesTab() {
  const { data: templates, isLoading, isError, refetch } = useTaskTemplates();
  const deactivate = useDeactivateTaskTemplate();
  const generateNow = useGenerateTasksNow();

  const runGeneration = async () => {
    try {
      const result = await generateNow.mutateAsync();
      toast.success(
        result.tasksCreated > 0
          ? `Generated ${result.tasksCreated} task${result.tasksCreated === 1 ? "" : "s"}.`
          : "Everything is already generated for this period.",
      );
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Generation failed.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" onClick={runGeneration} disabled={generateNow.isPending}>
          <Sparkles className="h-4 w-4" />
          {generateNow.isPending ? "Generating…" : "Generate tasks now"}
        </Button>
        <NewTemplateDialog />
      </div>

      {isLoading && <Skeleton className="h-24 w-full" />}
      {isError && <ErrorState description="We couldn't load templates." onRetry={() => refetch()} />}

      {!isLoading && !isError && templates && templates.length === 0 && (
        <EmptyState
          title="No recurring templates yet."
          description="Create one, e.g. a Monthly GST Workflow, and matching tasks generate automatically for every applicable client."
        />
      )}

      {!isLoading && !isError && templates && templates.length > 0 && (
        <div className="flex flex-col gap-3">
          {templates.map((tpl) => (
            <Card key={tpl.id}>
              <CardContent className="flex items-center justify-between pt-6">
                <div>
                  <p className="font-medium text-foreground">{tpl.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <Badge variant="neutral">{TASK_FREQUENCY_LABELS[tpl.frequency]}</Badge>
                    <Badge variant="neutral">{tpl.scope === "PER_CLIENT" ? "Per client" : "Firm-wide"}</Badge>
                    {!tpl.isActive && <Badge variant="cancelled">Inactive</Badge>}
                    <span>{tpl.checklistItems.length} steps</span>
                  </div>
                </div>
                {tpl.isActive && (
                  <Button variant="ghost" size="sm" onClick={() => deactivate.mutate(tpl.id)}>
                    Deactivate
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
