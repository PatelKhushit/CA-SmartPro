export type LeaveType = "CASUAL" | "SICK" | "EARNED" | "UNPAID" | "OTHER";
export type LeaveRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface LeaveRequest {
  id: string;
  userId: string;
  user: { id: string; fullName: string };
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: string;
  reason: string | null;
  status: LeaveRequestStatus;
  reviewedBy: { id: string; fullName: string } | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
}

export interface LeaveSummary {
  myRequests: {
    pending: number;
    approved: number;
    rejected: number;
    daysTakenThisYear: number;
  };
  team: {
    pendingApprovals: number;
  };
}

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  CASUAL: "Casual",
  SICK: "Sick",
  EARNED: "Earned",
  UNPAID: "Unpaid",
  OTHER: "Other",
};

export const LEAVE_STATUS_LABELS: Record<LeaveRequestStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export const LEAVE_STATUS_VARIANT: Record<LeaveRequestStatus, "neutral" | "attention" | "completed" | "overdue" | "upcoming" | "inProgress" | "cancelled"> = {
  PENDING: "attention",
  APPROVED: "completed",
  REJECTED: "overdue",
  CANCELLED: "cancelled",
};
