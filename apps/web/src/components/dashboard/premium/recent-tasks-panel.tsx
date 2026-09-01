import Link from "next/link";
import { CheckCircle2, Circle, CircleDashed } from "lucide-react";
import type { TaskListItem } from "@/lib/types/task";
import { PremiumCard, PremiumCardHeader } from "./premium-card";

const STATUS_ICON: Record<string, typeof CheckCircle2> = {
  COMPLETED: CheckCircle2,
  IN_PROGRESS: Circle,
};

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: "Completed",
  IN_PROGRESS: "In Progress",
  PENDING: "Pending",
  BLOCKED: "Blocked",
  CANCELLED: "Cancelled",
};

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: "var(--dash-success)",
  IN_PROGRESS: "var(--dash-accent)",
  PENDING: "var(--dash-danger)",
  BLOCKED: "var(--dash-danger)",
  CANCELLED: "var(--dash-text-muted)",
};

const STATUS_BG: Record<string, string> = {
  COMPLETED: "var(--dash-success-bg)",
  IN_PROGRESS: "var(--dash-accent-bg)",
  PENDING: "var(--dash-danger-bg)",
  BLOCKED: "var(--dash-danger-bg)",
  CANCELLED: "var(--dash-surface-2)",
};

export function RecentTasksPanel({ tasks }: { tasks: TaskListItem[] }) {
  const recent = tasks.slice(0, 6);

  return (
    <PremiumCard className="flex h-full flex-col">
      <PremiumCardHeader
        title="Recent Tasks"
        action={
          <Link
            href="/tasks"
            className="text-xs font-medium transition-opacity hover:opacity-80"
            style={{ color: "var(--dash-accent-bright)" }}
          >
            View All
          </Link>
        }
      />
      {recent.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-8">
          <p className="text-sm" style={{ color: "var(--dash-text-secondary)" }}>
            No tasks queued for today.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {recent.map((task) => {
            const StatusIcon = STATUS_ICON[task.status] ?? CircleDashed;
            return (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors"
                style={{ borderTop: "1px solid var(--dash-border)" }}
              >
                <StatusIcon
                  className="h-4 w-4 shrink-0"
                  style={{ color: STATUS_COLOR[task.status] ?? "var(--dash-text-muted)" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" style={{ color: "var(--dash-text-primary)" }}>
                    {task.title}
                  </p>
                  <p className="truncate text-xs" style={{ color: "var(--dash-text-secondary)" }}>
                    {task.client?.displayName ?? "Internal"}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-1 text-[10px] font-medium"
                  style={{
                    background: STATUS_BG[task.status] ?? "var(--dash-surface-2)",
                    color: STATUS_COLOR[task.status] ?? "var(--dash-text-muted)",
                  }}
                >
                  {STATUS_LABEL[task.status] ?? task.status}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </PremiumCard>
  );
}
