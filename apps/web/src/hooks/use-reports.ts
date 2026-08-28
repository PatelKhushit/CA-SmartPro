import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

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
