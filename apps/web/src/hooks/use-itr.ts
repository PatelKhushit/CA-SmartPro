import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { PaginatedResult } from "@/lib/types/client";
import type { ItrFormType, ItrReturn, ItrReturnStatus, ItrSummary } from "@/lib/types/itr";

export function useItrSummary() {
  return useQuery({ queryKey: ["itr", "summary"], queryFn: () => api.get<ItrSummary>("/itr/summary") });
}

export interface ItrReturnFilters {
  clientId?: string;
  status?: ItrReturnStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

function buildQuery(filters: ItrReturnFilters) {
  const params = new URLSearchParams();
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 20));
  return params.toString();
}

export function useItrReturns(filters: ItrReturnFilters) {
  return useQuery({
    queryKey: ["itr", "returns", filters],
    queryFn: () => api.get<PaginatedResult<ItrReturn>>(`/itr/returns?${buildQuery(filters)}`),
  });
}

export function useCreateItrReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      clientId: string;
      assessmentYear: string;
      formType: ItrFormType;
      dueDate: string;
      assignedUserId?: string;
      reviewerUserId?: string;
    }) => api.post<ItrReturn>("/itr/returns", input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["itr"] }),
  });
}

export function useUpdateItrReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string;
      status?: ItrReturnStatus;
      acknowledgementNumber?: string;
      refundAmount?: number;
      demandAmount?: number;
      assignedUserId?: string;
      reviewerUserId?: string;
      notes?: string;
    }) => api.patch<ItrReturn>(`/itr/returns/${id}`, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["itr"] }),
  });
}

export function useCreateItrReturnTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/itr/returns/${id}/task`, {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["itr"] }),
  });
}

export function useRequestItrDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/itr/returns/${id}/request-documents`, {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["document-requests"] }),
  });
}
