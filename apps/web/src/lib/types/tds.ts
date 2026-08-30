import type { ComplianceWorkStatus } from "./gst";

export type TdsReturnType = "FORM_24Q" | "FORM_26Q" | "FORM_27Q" | "FORM_27EQ";
export type TdsChallanStatus = "PENDING" | "PAID";
export type TdsCertificateType = "FORM_16" | "FORM_16A" | "FORM_27D";
export type TdsCertificateStatus = "PENDING" | "ISSUED";

export interface TdsProfile {
  id: string;
  clientId: string;
  client: { id: string; displayName: string; clientCode: string };
  tan: string;
  deductorType: string | null;
  isActive: boolean;
  _count?: { returns: number; challans: number; certificates: number };
}

export interface TdsReturn {
  id: string;
  clientId: string;
  client: { id: string; displayName: string; clientCode: string };
  tdsProfile: { id: string; tan: string };
  returnType: TdsReturnType;
  quarter: string;
  dueDate: string;
  status: ComplianceWorkStatus;
  assignedUser: { id: string; fullName: string } | null;
  taskId: string | null;
  notes: string | null;
}

export interface TdsChallan {
  id: string;
  clientId: string;
  client: { id: string; displayName: string };
  tdsProfile: { id: string; tan: string };
  challanNumber: string;
  amount: string;
  paymentDate: string | null;
  section: string | null;
  status: TdsChallanStatus;
}

export interface TdsCertificate {
  id: string;
  clientId: string;
  client: { id: string; displayName: string };
  tdsProfile: { id: string; tan: string };
  certificateType: TdsCertificateType;
  quarter: string;
  status: TdsCertificateStatus;
  issuedDate: string | null;
}

export interface TdsSummary {
  totalClients: number;
  returnsDue: number;
  returnsCompleted: number;
  challansPending: number;
  certificatesPending: number;
  overdue: number;
}

export const TDS_RETURN_TYPE_LABELS: Record<TdsReturnType, string> = {
  FORM_24Q: "Form 24Q",
  FORM_26Q: "Form 26Q",
  FORM_27Q: "Form 27Q",
  FORM_27EQ: "Form 27EQ",
};

export const TDS_CERT_TYPE_LABELS: Record<TdsCertificateType, string> = {
  FORM_16: "Form 16",
  FORM_16A: "Form 16A",
  FORM_27D: "Form 27D",
};
