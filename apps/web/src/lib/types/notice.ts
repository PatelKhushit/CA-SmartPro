import type { ServiceCategory } from "./client";

export type NoticeStatus =
  | "NEW"
  | "UNDER_REVIEW"
  | "DRAFTING"
  | "WAITING_FOR_CLIENT"
  | "READY_TO_SUBMIT"
  | "SUBMITTED"
  | "CLOSED"
  | "OVERDUE";

export type NoticePriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface NoticeListItem {
  id: string;
  clientId: string;
  client: { id: string; displayName: string; clientCode: string };
  department: ServiceCategory;
  noticeType: string;
  referenceNumber: string;
  noticeDate: string;
  responseDeadline: string | null;
  assignedUser: { id: string; fullName: string } | null;
  priority: NoticePriority;
  status: NoticeStatus;
  _count?: { comments: number; documents: number };
  createdAt: string;
}

export interface NoticeComment {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; fullName: string };
}

export interface NoticeDocumentLink {
  id: string;
  document: { id: string; title: string; category: string };
}

export interface NoticeTask {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
}

export interface NoticeDetail extends Omit<NoticeListItem, "_count"> {
  description: string | null;
  createdBy: { id: string; fullName: string };
  closedAt: string | null;
  comments: NoticeComment[];
  documents: NoticeDocumentLink[];
  tasks: NoticeTask[];
}

export interface NoticeSummary {
  new: number;
  underReview: number;
  drafting: number;
  waitingForClient: number;
  readyToSubmit: number;
  submitted: number;
  closed: number;
  overdue: number;
}

export const NOTICE_STATUS_LABELS: Record<NoticeStatus, string> = {
  NEW: "New",
  UNDER_REVIEW: "Under Review",
  DRAFTING: "Drafting",
  WAITING_FOR_CLIENT: "Waiting for Client",
  READY_TO_SUBMIT: "Ready to Submit",
  SUBMITTED: "Submitted",
  CLOSED: "Closed",
  OVERDUE: "Overdue",
};

export const NOTICE_STATUS_VARIANT: Record<NoticeStatus, "neutral" | "brand" | "completed" | "inProgress" | "upcoming" | "attention" | "overdue" | "blocked" | "cancelled"> = {
  NEW: "upcoming",
  UNDER_REVIEW: "inProgress",
  DRAFTING: "inProgress",
  WAITING_FOR_CLIENT: "attention",
  READY_TO_SUBMIT: "attention",
  SUBMITTED: "completed",
  CLOSED: "cancelled",
  OVERDUE: "overdue",
};
