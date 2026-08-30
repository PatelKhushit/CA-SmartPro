import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { PaginatedResult } from "@/lib/types/client";
import type { UDINDocumentType, UDINStatus, UdinRecord, UdinSummary } from "@/lib/types/udin";

export interface UdinFilters {
  clientId?: string;
  status?: UDINStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

function buildQuery(filters: UdinFilters) {
  const params = new URLSearchParams();
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 20));
  return params.toString();
}

export function useUdinSummary() {
  return useQuery({ queryKey: ["udin", "summary"], queryFn: () => api.get<UdinSummary>("/udin/summary") });
}

export function useUdinRecords(filters: UdinFilters) {
  return useQuery({
    queryKey: ["udin", filters],
    queryFn: () => api.get<PaginatedResult<UdinRecord>>(`/udin?${buildQuery(filters)}`),
  });
}

export interface CreateUdinInput {
  clientId: string;
  documentType?: UDINDocumentType;
  documentDate: string;
  description?: string;
  assignedUserId?: string;
  notes?: string;
}

export function useCreateUdin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUdinInput) => api.post<UdinRecord>("/udin", input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["udin"] }),
  });
}

export function useUpdateUdin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; udinNumber?: string; status?: UDINStatus; notes?: string }) =>
      api.patch<UdinRecord>(`/udin/${id}`, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["udin"] }),
  });
}

export function useCopyUdin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<UdinRecord>(`/udin/${id}/copy`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["udin"] }),
  });
}
