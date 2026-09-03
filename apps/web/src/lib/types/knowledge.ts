export type KnowledgeDocumentStatus = "PROCESSING" | "READY" | "FAILED";

export interface KnowledgeDocumentListItem {
  id: string;
  title: string;
  status: KnowledgeDocumentStatus;
  errorMessage: string | null;
  createdBy: { id: string; fullName: string };
  createdAt: string;
  _count: { chunks: number };
}

export interface KnowledgeChunk {
  id: string;
  chunkIndex: number;
  content: string;
}

export interface KnowledgeDocumentDetail extends KnowledgeDocumentListItem {
  content: string;
  chunks: KnowledgeChunk[];
}

export interface KnowledgeSearchResult {
  documentId: string;
  documentTitle: string;
  content: string;
  score: number;
}

export const KNOWLEDGE_STATUS_LABELS: Record<KnowledgeDocumentStatus, string> = {
  PROCESSING: "Processing",
  READY: "Ready",
  FAILED: "Failed",
};

export const KNOWLEDGE_STATUS_VARIANT: Record<KnowledgeDocumentStatus, "neutral" | "attention" | "completed" | "overdue" | "upcoming" | "inProgress" | "cancelled"> = {
  PROCESSING: "inProgress",
  READY: "completed",
  FAILED: "overdue",
};
