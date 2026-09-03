import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { PaginatedResult } from "@/lib/types/client";
import type { AttendanceRecord, AttendanceStatus, AttendanceSummary } from "@/lib/types/attendance";

export function useAttendanceSummary() {
  return useQuery({ queryKey: ["attendance", "summary"], queryFn: () => api.get<AttendanceSummary>("/attendance/summary") });
}

export interface AttendanceFilters {
  userId?: string;
  month?: string;
  status?: AttendanceStatus;
  page?: number;
  pageSize?: number;
}

function buildQuery(filters: AttendanceFilters) {
  const params = new URLSearchParams();
  if (filters.userId) params.set("userId", filters.userId);
  if (filters.month) params.set("month", filters.month);
  if (filters.status) params.set("status", filters.status);
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 50));
  return params.toString();
}

export function useAttendanceRecords(filters: AttendanceFilters) {
  return useQuery({
    queryKey: ["attendance", "records", filters],
    queryFn: () => api.get<PaginatedResult<AttendanceRecord>>(`/attendance?${buildQuery(filters)}`),
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<AttendanceRecord>("/attendance/check-in", {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<AttendanceRecord>("/attendance/check-out", {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; date: string; status: AttendanceStatus; notes?: string }) =>
      api.post<AttendanceRecord>("/attendance/mark", input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

export function useUpdateAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; status?: AttendanceStatus; notes?: string }) => api.patch<AttendanceRecord>(`/attendance/${id}`, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["attendance"] }),
  });
}
