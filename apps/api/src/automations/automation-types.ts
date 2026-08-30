// Shape of the Json `conditions`/`actions` columns on AutomationRule. Not
// DB-enforced (Postgres Json column), so the engine defensively validates
// shape at execution time and records an explicit SKIPPED/FAILED execution
// for anything malformed or unsupported — it never silently no-ops.

export interface ClientActiveCondition {
  field: 'client.status';
  op: 'eq';
  value: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
}

export type AutomationCondition = ClientActiveCondition;

export interface CreateNotificationAction {
  type: 'CREATE_NOTIFICATION';
  title: string;
  body: string;
}

export interface CreateTaskAction {
  type: 'CREATE_TASK';
  title: string;
}

export interface SendEmailAction {
  type: 'SEND_EMAIL';
  subject: string;
}

export interface SendWhatsAppAction {
  type: 'SEND_WHATSAPP';
  template: string;
}

export type AutomationAction = CreateNotificationAction | CreateTaskAction | SendEmailAction | SendWhatsAppAction;

export function isAutomationAction(value: unknown): value is AutomationAction {
  if (!value || typeof value !== 'object') return false;
  const type = (value as { type?: unknown }).type;
  return type === 'CREATE_NOTIFICATION' || type === 'CREATE_TASK' || type === 'SEND_EMAIL' || type === 'SEND_WHATSAPP';
}

export function isClientActiveCondition(value: unknown): value is ClientActiveCondition {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return c.field === 'client.status' && c.op === 'eq' && typeof c.value === 'string';
}
