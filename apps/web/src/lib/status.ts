import type { BadgeProps } from "@/components/ui/badge";

/**
 * Single source of truth for status -> (label, color) across the app.
 * Never hardcode a status color inline — add it here instead.
 */
export const TASK_STATUS_MAP: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  PENDING: { label: "Upcoming", variant: "upcoming" },
  IN_PROGRESS: { label: "In Progress", variant: "inProgress" },
  BLOCKED: { label: "Blocked", variant: "blocked" },
  COMPLETED: { label: "Completed", variant: "completed" },
  CANCELLED: { label: "Cancelled", variant: "cancelled" },
  OVERDUE: { label: "Overdue", variant: "overdue" },
};

export const COMPLIANCE_STATUS_MAP: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  UPCOMING: { label: "Upcoming", variant: "upcoming" },
  DUE: { label: "Due", variant: "attention" },
  OVERDUE: { label: "Overdue", variant: "overdue" },
  COMPLETED: { label: "Completed", variant: "completed" },
  WAIVED: { label: "Waived", variant: "cancelled" },
};

export const PRIORITY_MAP: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  LOW: { label: "Low", variant: "neutral" },
  MEDIUM: { label: "Medium", variant: "brand" },
  HIGH: { label: "High", variant: "attention" },
  URGENT: { label: "Urgent", variant: "overdue" },
};

export function taskIsOverdue(dueDate: string | null | undefined, status: string): boolean {
  if (!dueDate || status === "COMPLETED" || status === "CANCELLED") return false;
  return new Date(dueDate).getTime() < Date.now();
}

export function effectiveTaskStatus(dueDate: string | null | undefined, status: string) {
  if (taskIsOverdue(dueDate, status)) return TASK_STATUS_MAP.OVERDUE;
  return TASK_STATUS_MAP[status] ?? TASK_STATUS_MAP.PENDING;
}
