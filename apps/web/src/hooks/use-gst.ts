import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { PaginatedResult } from "@/lib/types/client";
import type { ComplianceWorkStatus, GstProfile, GstReturn, GstReturnType, GstSummary } from "@/lib/types/gst";

export function useGstSummary() {
  return useQuery({ queryKey: ["gst", "summary"], queryFn: () => api.get<GstSummary>("/gst/summary") });
}

export function useGstProfiles(clientId?: string) {
  return useQuery({
    queryKey: ["gst", "profiles", clientId],
    queryFn: () => api.get<GstProfile[]>(`/gst/profiles${clientId ? `?clientId=${clientId}` : ""}`),
  });
}

export function useCreateGstProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { clientId: string; gstin: string; tradeName?: string; state?: string }) =>
      api.post<GstProfile>("/gst/profiles", input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["gst"] }),
  });
}

export interface GstReturnFilters {
  clientId?: string;
  status?: ComplianceWorkStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

function buildQuery(filters: GstReturnFilters) {
  const params = new URLSearchParams();
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 20));
  return params.toString();
}

export function useGstReturns(filters: GstReturnFilters) {
  return useQuery({
    queryKey: ["gst", "returns", filters],
    queryFn: () => api.get<PaginatedResult<GstReturn>>(`/gst/returns?${buildQuery(filters)}`),
  });
}

export function useCreateGstReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { gstProfileId: string; returnType: GstReturnType; taxPeriod: string; dueDate: string; assignedUserId?: string }) =>
      api.post<GstReturn>("/gst/returns", input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["gst"] }),
  });
}

export function useUpdateGstReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; status?: ComplianceWorkStatus; assignedUserId?: string; notes?: string }) =>
      api.patch<GstReturn>(`/gst/returns/${id}`, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["gst"] }),
  });
}

export function useCreateGstReturnTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/gst/returns/${id}/task`, {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["gst"] }),
  });
}

export function useRequestGstDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/gst/returns/${id}/request-documents`, {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["document-requests"] }),
  });
}
