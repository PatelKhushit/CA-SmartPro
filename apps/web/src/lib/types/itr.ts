export type ItrFormType = "ITR_1" | "ITR_2" | "ITR_3" | "ITR_4" | "ITR_5" | "ITR_6" | "ITR_7" | "OTHER";
export type ItrReturnStatus =
  | "DATA_COLLECTION"
  | "PREPARATION"
  | "REVIEW"
  | "CLIENT_APPROVAL"
  | "FILED"
  | "VERIFICATION"
  | "COMPLETED"
  | "DEMAND"
  | "REFUND";

export interface ItrReturn {
  id: string;
  clientId: string;
  client: { id: string; displayName: string; clientCode: string; pan: string | null };
  assessmentYear: string;
  formType: ItrFormType;
  status: ItrReturnStatus;
  acknowledgementNumber: string | null;
  refundAmount: string | null;
  demandAmount: string | null;
  dueDate: string;
  filingDate: string | null;
  assignedUser: { id: string; fullName: string } | null;
  reviewer: { id: string; fullName: string } | null;
  taskId: string | null;
  notes: string | null;
  completedAt: string | null;
}

export interface ItrSummary {
  totalClients: number;
  returnsDue: number;
  returnsFiled: number;
  pendingDocuments: number;
}

export const ITR_FORM_TYPE_LABELS: Record<ItrFormType, string> = {
  ITR_1: "ITR-1 (Sahaj)",
  ITR_2: "ITR-2",
  ITR_3: "ITR-3",
  ITR_4: "ITR-4 (Sugam)",
  ITR_5: "ITR-5",
  ITR_6: "ITR-6",
  ITR_7: "ITR-7",
  OTHER: "Other",
};

export const ITR_STATUS_LABELS: Record<ItrReturnStatus, string> = {
  DATA_COLLECTION: "Data Collection",
  PREPARATION: "Preparation",
  REVIEW: "Review",
  CLIENT_APPROVAL: "Client Approval",
  FILED: "Filed",
  VERIFICATION: "Verification",
  COMPLETED: "Completed",
  DEMAND: "Demand",
  REFUND: "Refund",
};

export const ITR_STATUS_VARIANT: Record<ItrReturnStatus, "neutral" | "attention" | "completed" | "overdue" | "upcoming" | "inProgress" | "cancelled"> = {
  DATA_COLLECTION: "upcoming",
  PREPARATION: "inProgress",
  REVIEW: "inProgress",
  CLIENT_APPROVAL: "attention",
  FILED: "inProgress",
  VERIFICATION: "inProgress",
  COMPLETED: "completed",
  DEMAND: "overdue",
  REFUND: "completed",
};
