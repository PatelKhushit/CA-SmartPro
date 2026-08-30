import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { PaginatedResult } from "@/lib/types/client";
import type { ComplianceWorkStatus } from "@/lib/types/gst";
import type {
  TdsCertificate,
  TdsCertificateStatus,
  TdsCertificateType,
  TdsChallan,
  TdsChallanStatus,
  TdsProfile,
  TdsReturn,
  TdsReturnType,
  TdsSummary,
} from "@/lib/types/tds";

export function useTdsSummary() {
  return useQuery({ queryKey: ["tds", "summary"], queryFn: () => api.get<TdsSummary>("/tds/summary") });
}

export function useTdsProfiles(clientId?: string) {
  return useQuery({
    queryKey: ["tds", "profiles", clientId],
    queryFn: () => api.get<TdsProfile[]>(`/tds/profiles${clientId ? `?clientId=${clientId}` : ""}`),
  });
}

export function useCreateTdsProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { clientId: string; tan: string; deductorType?: string }) => api.post<TdsProfile>("/tds/profiles", input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["tds"] }),
  });
}

export interface TdsReturnFilters {
  clientId?: string;
  status?: ComplianceWorkStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

function buildQuery(filters: TdsReturnFilters) {
  const params = new URLSearchParams();
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 20));
  return params.toString();
}

export function useTdsReturns(filters: TdsReturnFilters) {
  return useQuery({
    queryKey: ["tds", "returns", filters],
    queryFn: () => api.get<PaginatedResult<TdsReturn>>(`/tds/returns?${buildQuery(filters)}`),
  });
}

export function useCreateTdsReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { tdsProfileId: string; returnType: TdsReturnType; quarter: string; dueDate: string; assignedUserId?: string }) =>
      api.post<TdsReturn>("/tds/returns", input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["tds"] }),
  });
}

export function useUpdateTdsReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; status?: ComplianceWorkStatus; assignedUserId?: string; notes?: string }) =>
      api.patch<TdsReturn>(`/tds/returns/${id}`, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["tds"] }),
  });
}

export function useCreateTdsReturnTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/tds/returns/${id}/task`, {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["tds"] }),
  });
}

export function useTdsChallans(clientId?: string) {
  return useQuery({
    queryKey: ["tds", "challans", clientId],
    queryFn: () => api.get<TdsChallan[]>(`/tds/challans${clientId ? `?clientId=${clientId}` : ""}`),
  });
}

export function useCreateTdsChallan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { tdsProfileId: string; challanNumber: string; amount: number; paymentDate?: string; section?: string }) =>
      api.post<TdsChallan>("/tds/challans", input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["tds", "challans"] }),
  });
}

export function useUpdateTdsChallan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; status?: TdsChallanStatus; paymentDate?: string }) =>
      api.patch<TdsChallan>(`/tds/challans/${id}`, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["tds", "challans"] }),
  });
}

export function useTdsCertificates(clientId?: string) {
  return useQuery({
    queryKey: ["tds", "certificates", clientId],
    queryFn: () => api.get<TdsCertificate[]>(`/tds/certificates${clientId ? `?clientId=${clientId}` : ""}`),
  });
}

export function useCreateTdsCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { tdsProfileId: string; certificateType: TdsCertificateType; quarter: string }) =>
      api.post<TdsCertificate>("/tds/certificates", input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["tds", "certificates"] }),
  });
}

export function useUpdateTdsCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; status?: TdsCertificateStatus; issuedDate?: string }) =>
      api.patch<TdsCertificate>(`/tds/certificates/${id}`, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["tds", "certificates"] }),
  });
}
