import type { ComplianceWorkStatus } from "./gst";

export type RocFormType =
  | "AOC_4"
  | "MGT_7"
  | "MGT_7A"
  | "ADT_1"
  | "DIR_3_KYC"
  | "DIR_12"
  | "DPT_3"
  | "INC_20A"
  | "PAS_3"
  | "LLP_FORM_8"
  | "LLP_FORM_11"
  | "OTHER";

export interface RocFiling {
  id: string;
  clientId: string;
  client: { id: string; displayName: string; clientCode: string; cinOrLlpin: string | null };
  formType: RocFormType;
  financialYear: string;
  status: ComplianceWorkStatus;
  dueDate: string;
  filingDate: string | null;
  srn: string | null;
  assignedUser: { id: string; fullName: string } | null;
  taskId: string | null;
  notes: string | null;
  completedAt: string | null;
}

export interface RocSummary {
  totalClients: number;
  returnsDue: number;
  returnsCompleted: number;
  overdue: number;
  pendingDocuments: number;
}

export const ROC_FORM_TYPE_LABELS: Record<RocFormType, string> = {
  AOC_4: "AOC-4 (Financial Statements)",
  MGT_7: "MGT-7 (Annual Return)",
  MGT_7A: "MGT-7A (Annual Return — Small Co./OPC)",
  ADT_1: "ADT-1 (Auditor Appointment)",
  DIR_3_KYC: "DIR-3 KYC",
  DIR_12: "DIR-12 (Change in Directors)",
  DPT_3: "DPT-3 (Return of Deposits)",
  INC_20A: "INC-20A (Commencement of Business)",
  PAS_3: "PAS-3 (Return of Allotment)",
  LLP_FORM_8: "LLP Form 8 (Statement of Account & Solvency)",
  LLP_FORM_11: "LLP Form 11 (Annual Return)",
  OTHER: "Other",
};

export { WORK_STATUS_LABELS as ROC_STATUS_LABELS, WORK_STATUS_VARIANT as ROC_STATUS_VARIANT } from "./gst";
export type { ComplianceWorkStatus as RocFilingStatus } from "./gst";
