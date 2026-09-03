import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { PaginatedResult } from "@/lib/types/client";
import type { RocFiling, RocFilingStatus, RocFormType, RocSummary } from "@/lib/types/roc";

export function useRocSummary() {
  return useQuery({ queryKey: ["roc", "summary"], queryFn: () => api.get<RocSummary>("/roc/summary") });
}

export interface RocFilingFilters {
  clientId?: string;
  status?: RocFilingStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

function buildQuery(filters: RocFilingFilters) {
  const params = new URLSearchParams();
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 20));
  return params.toString();
}

export function useRocFilings(filters: RocFilingFilters) {
  return useQuery({
    queryKey: ["roc", "filings", filters],
    queryFn: () => api.get<PaginatedResult<RocFiling>>(`/roc/filings?${buildQuery(filters)}`),
  });
}

export function useCreateRocFiling() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      clientId: string;
      formType: RocFormType;
      financialYear: string;
      dueDate: string;
      assignedUserId?: string;
    }) => api.post<RocFiling>("/roc/filings", input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["roc"] }),
  });
}

export function useUpdateRocFiling() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string;
      status?: RocFilingStatus;
      filingDate?: string;
      srn?: string;
      assignedUserId?: string;
      notes?: string;
    }) => api.patch<RocFiling>(`/roc/filings/${id}`, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["roc"] }),
  });
}

export function useCreateRocFilingTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/roc/filings/${id}/task`, {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["roc"] }),
  });
}

export function useRequestRocDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/roc/filings/${id}/request-documents`, {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["document-requests"] }),
  });
}
