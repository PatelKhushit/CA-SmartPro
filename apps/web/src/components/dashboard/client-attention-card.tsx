"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useTasks } from "@/hooks/use-tasks";
import { useDocumentRequests } from "@/hooks/use-document-requests";

interface AttentionItem {
  id: string;
  clientName: string;
  reason: string;
  href: string;
}

/** Real, clickable "needs attention" feed — no invented reasons, only overdue tasks and pending document requests that already exist in the DB. */
export function ClientAttentionCard() {
  const { data: overdueTasks, isLoading: loadingTasks } = useTasks({ overdue: true, pageSize: 5 });
  const { data: pendingDocs, isLoading: loadingDocs } = useDocumentRequests({ status: "PENDING", pageSize: 5 });
  const isLoading = loadingTasks || loadingDocs;

  const items: AttentionItem[] = [
    ...(overdueTasks?.items ?? [])
      .filter((task) => task.client)
      .map((task) => ({
        id: `task-${task.id}`,
        clientName: task.client!.displayName,
        reason: `Overdue: ${task.title}`,
        href: `/tasks/${task.id}`,
      })),
    ...(pendingDocs?.items ?? []).map((request) => ({
      id: `doc-${request.id}`,
      clientName: request.client.displayName,
      reason: `Documents pending: ${request.title}`,
      href: `/clients/${request.clientId}`,
    })),
  ].slice(0, 6);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-status-attention" /> Needs attention
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-32 w-full" />}
        {!isLoading && items.length === 0 && (
          <EmptyState
            title="Nothing needs attention right now."
            description="Overdue tasks and pending document requests will show up here."
          />
        )}
        {!isLoading && items.length > 0 && (
          <div className="flex flex-col divide-y divide-border">
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5 hover:bg-muted-surface/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{item.clientName}</p>
                  <p className="truncate text-xs text-muted">{item.reason}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
