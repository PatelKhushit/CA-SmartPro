export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskStatus = "PENDING" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED" | "CANCELLED";
export type TaskCategory = "CLIENT_SPECIFIC" | "COMPLIANCE" | "DOCUMENT" | "PAYMENT" | "FOLLOW_UP" | "INTERNAL";
export type TaskFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY" | "ONE_TIME";
export type TemplateScope = "PER_CLIENT" | "FIRM_WIDE";

export interface TaskChecklistItem {
  id: string;
  title: string;
  order: number;
  isDone: boolean;
  doneAt: string | null;
}

export interface TaskComment {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; fullName: string };
}

export interface TaskListItem {
  id: string;
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  estimatedMinutes: number | null;
  client: { id: string; displayName: string; clientCode: string } | null;
  assignedUser: { id: string; fullName: string } | null;
  checklistItems: TaskChecklistItem[];
  _count: { comments: number };
}

export interface TaskDetail extends TaskListItem {
  description: string | null;
  startDate: string | null;
  frequency: TaskFrequency;
  completedAt: string | null;
  actualMinutes: number | null;
  comments: TaskComment[];
}

export interface TaskTimeEntry {
  id: string;
  taskId: string;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  user: { id: string; fullName: string };
}

export interface RunningTimer {
  id: string;
  taskId: string;
  startedAt: string;
  task: { id: string; title: string; client: { displayName: string } | null };
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  category: TaskCategory;
  frequency: TaskFrequency;
  scope: TemplateScope;
  applicableServiceType: string | null;
  defaultPriority: TaskPriority;
  estimatedMinutes: number | null;
  checklistItems: string[];
  dueDayOfPeriod: number | null;
  leadDays: number;
  isActive: boolean;
}

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  CLIENT_SPECIFIC: "Client-specific",
  COMPLIANCE: "Compliance",
  DOCUMENT: "Document",
  PAYMENT: "Payment",
  FOLLOW_UP: "Follow-up",
  INTERNAL: "Internal",
};

export const TASK_FREQUENCY_LABELS: Record<TaskFrequency, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  HALF_YEARLY: "Half-yearly",
  YEARLY: "Yearly",
  ONE_TIME: "One-time",
};
