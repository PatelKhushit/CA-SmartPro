export type AutomationTriggerType = "TASK_OVERDUE" | "COMPLIANCE_DUE_SOON" | "DOCUMENT_REQUEST_OVERDUE";
export type AutomationExecutionStatus = "SUCCESS" | "FAILED" | "SKIPPED" | "WAITING" | "CANCELLED";
export type AutomationActionType = "CREATE_NOTIFICATION" | "CREATE_TASK" | "SEND_EMAIL" | "SEND_WHATSAPP";

export interface AutomationAction {
  type: AutomationActionType;
  title?: string;
  body?: string;
  subject?: string;
  template?: string;
}

export interface ClientActiveCondition {
  field: "client.status";
  op: "eq";
  value: "ACTIVE" | "INACTIVE" | "ARCHIVED";
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  triggerType: AutomationTriggerType;
  triggerConfig: Record<string, unknown>;
  conditions: ClientActiveCondition[];
  actions: AutomationAction[];
  isEnabled: boolean;
  createdBy: { id: string; fullName: string };
  createdAt: string;
  lastRunAt: string | null;
  _count: { executions: number };
}

export interface AutomationExecution {
  id: string;
  automationRuleId: string;
  automationRule: { id: string; name: string };
  triggerEntityType: string;
  triggerEntityId: string;
  clientId: string | null;
  clientName: string | null;
  status: AutomationExecutionStatus;
  actionsSummary: Array<{ type: string; status: string; detail?: string }>;
  error: string | null;
  triggeredAt: string;
  completedAt: string | null;
}

export const TRIGGER_TYPE_LABELS: Record<AutomationTriggerType, string> = {
  TASK_OVERDUE: "Task Overdue",
  COMPLIANCE_DUE_SOON: "Compliance Due Soon",
  DOCUMENT_REQUEST_OVERDUE: "Document Request Overdue",
};

export const ACTION_TYPE_LABELS: Record<AutomationActionType, string> = {
  CREATE_NOTIFICATION: "Create Notification",
  CREATE_TASK: "Create Task",
  SEND_EMAIL: "Send Email (not yet available)",
  SEND_WHATSAPP: "Send WhatsApp (not yet available)",
};

export const EXECUTION_STATUS_VARIANT: Record<AutomationExecutionStatus, "neutral" | "attention" | "completed" | "overdue" | "upcoming" | "inProgress" | "cancelled"> = {
  SUCCESS: "completed",
  FAILED: "overdue",
  SKIPPED: "neutral",
  WAITING: "upcoming",
  CANCELLED: "cancelled",
};
