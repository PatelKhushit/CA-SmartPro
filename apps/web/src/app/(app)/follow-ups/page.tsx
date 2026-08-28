"use client";

import Link from "next/link";
import { PhoneCall } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTasks } from "@/hooks/use-tasks";
import { PRIORITY_MAP, effectiveTaskStatus } from "@/lib/status";

function formatDueDate(dueDate: string | null) {
  if (!dueDate) return "No due date";
  return new Date(dueDate).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * Follow-ups aren't a dedicated entity yet (see docs/STATUS.md) — they're
 * modeled as tasks with category=FOLLOW_UP, so this reuses the real Tasks
 * API filtered to that category rather than a separate parallel system.
 */
export default function FollowUpsPage() {
  const { data, isLoading, isError, refetch } = useTasks({ category: "FOLLOW_UP", pageSize: 100 });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Follow-ups</h1>
        <p className="text-sm text-muted">Client follow-ups across your firm, tracked as follow-up tasks.</p>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {isError && <ErrorState description="We couldn't load follow-ups." onRetry={() => refetch()} />}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState
          icon={PhoneCall}
          title="No follow-ups yet."
          description="Create a task with category Follow-up from a client's profile or the Tasks page."
        />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reason</TableHead>
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
    </div>
  );
}
