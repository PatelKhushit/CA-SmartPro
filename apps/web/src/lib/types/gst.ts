export type GstReturnType = "GSTR1" | "GSTR3B" | "GSTR9" | "GSTR9C" | "CMP08" | "OTHER";
export type ComplianceWorkStatus = "UPCOMING" | "DUE_TODAY" | "SUBMITTED" | "COMPLETED" | "OVERDUE" | "WAITING_FOR_CLIENT" | "NOT_APPLICABLE";

export interface GstProfile {
  id: string;
  clientId: string;
  client: { id: string; displayName: string; clientCode: string };
  gstin: string;
  tradeName: string | null;
  state: string | null;
  isActive: boolean;
  _count?: { returns: number };
}

export interface GstReturn {
  id: string;
  clientId: string;
  client: { id: string; displayName: string; clientCode: string };
  gstProfile: { id: string; gstin: string };
  returnType: GstReturnType;
  taxPeriod: string;
  dueDate: string;
  status: ComplianceWorkStatus;
  assignedUser: { id: string; fullName: string } | null;
  taskId: string | null;
  notes: string | null;
  completedAt: string | null;
}

export interface GstSummary {
  totalClients: number;
  returnsDue: number;
  returnsCompleted: number;
  overdue: number;
  pendingDocuments: number;
}

export const GST_RETURN_TYPE_LABELS: Record<GstReturnType, string> = {
  GSTR1: "GSTR-1",
  GSTR3B: "GSTR-3B",
  GSTR9: "GSTR-9",
  GSTR9C: "GSTR-9C",
  CMP08: "CMP-08",
  OTHER: "Other",
};

export const WORK_STATUS_LABELS: Record<ComplianceWorkStatus, string> = {
  UPCOMING: "Upcoming",
  DUE_TODAY: "Due Today",
  SUBMITTED: "Submitted",
  COMPLETED: "Completed",
  OVERDUE: "Overdue",
  WAITING_FOR_CLIENT: "Waiting for Client",
  NOT_APPLICABLE: "Not Applicable",
};

export const WORK_STATUS_VARIANT: Record<ComplianceWorkStatus, "neutral" | "attention" | "completed" | "overdue" | "upcoming" | "inProgress" | "cancelled"> = {
  UPCOMING: "upcoming",
  DUE_TODAY: "attention",
  SUBMITTED: "inProgress",
  COMPLETED: "completed",
  OVERDUE: "overdue",
  WAITING_FOR_CLIENT: "attention",
  NOT_APPLICABLE: "cancelled",
};
