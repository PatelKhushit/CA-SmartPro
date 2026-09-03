import { useQuery } from "@tanstack/react-query";
import { api, getAccessToken } from "@/lib/api-client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

/** Shared download helper for the report export endpoints (CSV/PDF/XLSX) — all return a raw file, not JSON. */
export async function downloadReportFile(path: string, filename: string) {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: "include",
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface DailyReportTask {
  title: string;
  priority: string;
  status: string;
  dueDate: string | null;
  client: { displayName: string } | null;
  assignedUser: { fullName: string } | null;
}

export interface DailyReport {
  date: string;
  completed: number;
  pending: number;
  overdue: number;
  followUps: number;
  tasks: DailyReportTask[];
}

export interface MonthlyReport {
  month: string;
  productivityPercent: number;
  complianceHealthPercent: number;
  tasksCompleted: number;
  tasksTotal: number;
  complianceCompleted: number;
  complianceTotal: number;
  activeClients: number;
}

export interface TeamReportRow {
  userId: string;
  fullName: string;
  role: string;
  assigned: number;
  completed: number;
  overdue: number;
  completionRate: number;
}

export function useDailyReport(date?: string) {
  return useQuery({
    queryKey: ["reports", "daily", date],
    queryFn: () => api.get<DailyReport>(`/reports/daily${date ? `?date=${date}` : ""}`),
  });
}

export function useMonthlyReport(month?: string) {
  return useQuery({
    queryKey: ["reports", "monthly", month],
    queryFn: () => api.get<MonthlyReport>(`/reports/monthly${month ? `?month=${month}` : ""}`),
  });
}

export function useTeamReport() {
  return useQuery({
    queryKey: ["reports", "team"],
    queryFn: () => api.get<TeamReportRow[]>("/reports/team"),
  });
}

export interface ComplianceReport {
  gst: { totalClients: number; returnsDue: number; returnsCompleted: number; overdue: number; pendingDocuments: number };
  tds: { totalClients: number; returnsDue: number; returnsCompleted: number; challansPending: number; certificatesPending: number; overdue: number };
  itr: { totalClients: number; returnsDue: number; returnsFiled: number; pendingDocuments: number };
  roc: { totalClients: number; returnsDue: number; returnsCompleted: number; overdue: number; pendingDocuments: number };
  udin: { pending: number; generated: number; verified: number; expired: number };
  notices: { new: number; underReview: number; drafting: number; waitingForClient: number; readyToSubmit: number; submitted: number; closed: number; overdue: number };
}

export interface BillingReport {
  activeFeePlans: number;
  outstandingInvoices: number;
  totalOutstanding: number;
  overdueInvoices: number;
  collectedThisMonth: number;
  topOverdueInvoices: { invoiceNumber: string; client: string; dueDate: string; balance: string }[];
}

export function useComplianceReport() {
  return useQuery({
    queryKey: ["reports", "compliance"],
    queryFn: () => api.get<ComplianceReport>("/reports/compliance"),
  });
}

export function useBillingReport() {
  return useQuery({
    queryKey: ["reports", "billing"],
    queryFn: () => api.get<BillingReport>("/reports/billing"),
  });
}
