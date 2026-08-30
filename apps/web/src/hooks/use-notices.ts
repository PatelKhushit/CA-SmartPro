import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { NoticeDetail, NoticeListItem, NoticePriority, NoticeStatus, NoticeSummary } from "@/lib/types/notice";
import type { PaginatedResult, ServiceCategory } from "@/lib/types/client";

export interface NoticeFilters {
  clientId?: string;
  status?: NoticeStatus;
  department?: ServiceCategory;
  search?: string;
  page?: number;
  pageSize?: number;
}

function buildQuery(filters: NoticeFilters) {
  const params = new URLSearchParams();
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.status) params.set("status", filters.status);
  if (filters.department) params.set("department", filters.department);
  if (filters.search) params.set("search", filters.search);
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 20));
  return params.toString();
}

export function useNoticeSummary() {
  return useQuery({ queryKey: ["notices", "summary"], queryFn: () => api.get<NoticeSummary>("/notices/summary") });
}

export function useNotices(filters: NoticeFilters) {
  return useQuery({
    queryKey: ["notices", filters],
    queryFn: () => api.get<PaginatedResult<NoticeListItem>>(`/notices?${buildQuery(filters)}`),
  });
}

export function useNotice(id: string | undefined) {
  return useQuery({
    queryKey: ["notices", id],
    queryFn: () => api.get<NoticeDetail>(`/notices/${id}`),
    enabled: !!id,
  });
}

export interface CreateNoticeInput {
  clientId: string;
  department?: ServiceCategory;
  noticeType: string;
  referenceNumber: string;
  noticeDate: string;
  responseDeadline?: string;
  assignedUserId?: string;
  priority?: NoticePriority;
  description?: string;
}

function invalidateNotices(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  void queryClient.invalidateQueries({ queryKey: ["notices"] });
  if (id) void queryClient.invalidateQueries({ queryKey: ["notices", id] });
}

export function useCreateNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNoticeInput) => api.post<NoticeDetail>("/notices", input),
    onSuccess: () => invalidateNotices(queryClient),
  });
}

export function useUpdateNotice(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CreateNoticeInput> & { status?: NoticeStatus }) => api.patch<NoticeDetail>(`/notices/${id}`, input),
    onSuccess: () => invalidateNotices(queryClient, id),
  });
}

export function useAddNoticeComment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.post<NoticeDetail>(`/notices/${id}/comments`, { body }),
    onSuccess: () => invalidateNotices(queryClient, id),
  });
}

export function useLinkNoticeDocument(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => api.post<NoticeDetail>(`/notices/${id}/documents`, { documentId }),
    onSuccess: () => invalidateNotices(queryClient, id),
  });
}

export function useCreateNoticeTask(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; assignedUserId?: string; dueDate?: string }) =>
      api.post<NoticeDetail>(`/notices/${id}/tasks`, input),
    onSuccess: () => invalidateNotices(queryClient, id),
  });
}
