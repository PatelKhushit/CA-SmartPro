import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  ClientDetail,
  ClientListItem,
  ClientContact,
  ClientService,
  PaginatedResult,
} from "@/lib/types/client";

export interface ClientListFilters {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

function buildQuery(filters: ClientListFilters) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 20));
  return params.toString();
}

export function useClients(filters: ClientListFilters) {
  return useQuery({
    queryKey: ["clients", filters],
    queryFn: () => api.get<PaginatedResult<ClientListItem>>(`/clients?${buildQuery(filters)}`),
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ["clients", id],
    queryFn: () => api.get<ClientDetail>(`/clients/${id}`),
    enabled: !!id,
  });
}

export interface CreateClientInput {
  displayName: string;
  legalName?: string;
  businessType?: string;
  pan?: string;
  gstin?: string;
  tan?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClientInput) => api.post<ClientDetail>("/clients", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useUpdateClient(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CreateClientInput> & { status?: string }) =>
      api.patch<ClientDetail>(`/clients/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["clients", id] });
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useArchiveClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/clients/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useAddContact(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ClientContact>) =>
      api.post<ClientContact>(`/clients/${clientId}/contacts`, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["clients", clientId] }),
  });
}

export function useRemoveContact(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contactId: string) =>
      api.delete<{ message: string }>(`/clients/${clientId}/contacts/${contactId}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["clients", clientId] }),
  });
}

export function useAddService(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ClientService>) =>
      api.post<ClientService>(`/clients/${clientId}/services`, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["clients", clientId] }),
  });
}

export function useRemoveService(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (serviceId: string) =>
      api.delete<{ message: string }>(`/clients/${clientId}/services/${serviceId}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["clients", clientId] }),
  });
}
