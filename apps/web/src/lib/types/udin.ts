export type UDINDocumentType = "CERTIFICATE" | "AUDIT_REPORT" | "GST_AUDIT" | "INCOME_TAX_AUDIT" | "REPORT" | "OTHER";
export type UDINStatus = "PENDING" | "GENERATED" | "VERIFIED" | "EXPIRED";

export interface UdinRecord {
  id: string;
  clientId: string;
  client: { id: string; displayName: string; clientCode: string };
  documentType: UDINDocumentType;
  documentDate: string;
  description: string | null;
  udinNumber: string | null;
  generatedDate: string | null;
  status: UDINStatus;
  assignedUser: { id: string; fullName: string } | null;
  createdBy: { id: string; fullName: string };
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UdinSummary {
  pending: number;
  generated: number;
  verified: number;
  expired: number;
}

export const UDIN_DOCUMENT_TYPE_LABELS: Record<UDINDocumentType, string> = {
  CERTIFICATE: "Certificate",
  AUDIT_REPORT: "Audit Report",
  GST_AUDIT: "GST Audit",
  INCOME_TAX_AUDIT: "Income Tax Audit",
  REPORT: "Report",
  OTHER: "Other",
};

export const UDIN_STATUS_VARIANT: Record<UDINStatus, "neutral" | "attention" | "inProgress" | "completed"> = {
  PENDING: "attention",
  GENERATED: "inProgress",
  VERIFIED: "completed",
  EXPIRED: "neutral",
};
