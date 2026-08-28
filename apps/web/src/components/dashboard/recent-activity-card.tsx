"use client";

import { formatDistanceToNow } from "date-fns";
import { History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuditLogs } from "@/hooks/use-audit-logs";

function humanizeAction(action: string): string {
  const words = action.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Real audit log entries only — the same data the Settings > Audit Log tab shows, just the most recent few. */
export function RecentActivityCard() {
  const { data: logs, isLoading } = useAuditLogs(6);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-40 w-full" />}
        {!isLoading && (!logs || logs.length === 0) && (
          <EmptyState icon={History} title="No activity recorded yet." />
        )}
        {!isLoading && logs && logs.length > 0 && (
          <div className="flex flex-col divide-y divide-border">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{humanizeAction(log.action)}</p>
                  <p className="text-xs text-muted">{log.user?.fullName ?? "System"}</p>
                </div>
                <span className="shrink-0 text-xs text-muted">
                  {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
