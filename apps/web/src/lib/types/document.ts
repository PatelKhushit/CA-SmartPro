export type DocumentCategory =
  | "PAN"
  | "GST"
  | "BANK"
  | "ITR"
  | "TDS"
  | "AUDIT"
  | "ROC"
  | "INVOICE"
  | "CERTIFICATE"
  | "NOTICE"
  | "WORKING_PAPER"
  | "OTHER";

export type DocumentStatus = "ACTIVE" | "ARCHIVED";

export interface DocumentVersion {
  id: string;
  versionNumber: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByUserId: string;
  createdAt: string;
}

export interface DocumentItem {
  id: string;
  clientId: string | null;
  client: { id: string; displayName: string } | null;
  category: DocumentCategory;
  title: string;
  description: string | null;
  status: DocumentStatus;
  uploadedBy: { id: string; fullName: string };
  versions: DocumentVersion[];
  _count?: { versions: number };
  createdAt: string;
  updatedAt: string;
}

export interface DownloadLink {
  token: string;
  expiresAt: string;
  filename: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  PAN: "PAN",
  GST: "GST",
  BANK: "Bank",
  ITR: "ITR",
  TDS: "TDS",
  AUDIT: "Audit",
  ROC: "ROC",
  INVOICE: "Invoice",
  CERTIFICATE: "Certificate",
  NOTICE: "Notice",
  WORKING_PAPER: "Working Paper",
  OTHER: "Other",
};

// --- Document Requests ---

export type DocumentRequestStatus = "PENDING" | "PARTIAL" | "FULFILLED" | "CANCELLED";
export type DocumentRequestItemStatus = "PENDING" | "UPLOADED" | "APPROVED" | "REJECTED";

export interface DocumentRequestItem {
  id: string;
  label: string;
  isRequired: boolean;
  status: DocumentRequestItemStatus;
  documentId: string | null;
  document: { id: string; title: string; category: DocumentCategory } | null;
  notes: string | null;
  createdAt: string;
}

export interface DocumentRequest {
  id: string;
  clientId: string;
  client: { id: string; displayName: string };
  title: string;
  description: string | null;
  dueDate: string | null;
  status: DocumentRequestStatus;
  createdBy: { id: string; fullName: string };
  items: DocumentRequestItem[];
  createdAt: string;
  updatedAt: string;
}

export const DOCUMENT_REQUEST_STATUS_LABELS: Record<DocumentRequestStatus, string> = {
  PENDING: "Pending",
  PARTIAL: "Partial",
  FULFILLED: "Fulfilled",
  CANCELLED: "Cancelled",
};
