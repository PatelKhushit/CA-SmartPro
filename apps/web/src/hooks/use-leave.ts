import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { PaginatedResult } from "@/lib/types/client";
import type { LeaveRequest, LeaveRequestStatus, LeaveSummary, LeaveType } from "@/lib/types/leave";

export function useLeaveSummary() {
  return useQuery({ queryKey: ["leave", "summary"], queryFn: () => api.get<LeaveSummary>("/leave/summary") });
}

export interface LeaveFilters {
  userId?: string;
  status?: LeaveRequestStatus;
  year?: number;
  page?: number;
  pageSize?: number;
}

function buildQuery(filters: LeaveFilters) {
  const params = new URLSearchParams();
  if (filters.userId) params.set("userId", filters.userId);
  if (filters.status) params.set("status", filters.status);
  if (filters.year) params.set("year", String(filters.year));
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 50));
  return params.toString();
}

export function useLeaveRequests(filters: LeaveFilters) {
  return useQuery({
    queryKey: ["leave", "requests", filters],
    queryFn: () => api.get<PaginatedResult<LeaveRequest>>(`/leave?${buildQuery(filters)}`),
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { leaveType: LeaveType; startDate: string; endDate: string; days: number; reason?: string }) =>
      api.post<LeaveRequest>("/leave", input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["leave"] }),
  });
}

export function useCancelLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<LeaveRequest>(`/leave/${id}/cancel`, {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["leave"] }),
  });
}

export function useApproveLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewNotes }: { id: string; reviewNotes?: string }) => api.post<LeaveRequest>(`/leave/${id}/approve`, { reviewNotes }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["leave"] });
      void queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useRejectLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewNotes }: { id: string; reviewNotes?: string }) => api.post<LeaveRequest>(`/leave/${id}/reject`, { reviewNotes }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["leave"] }),
  });
}
