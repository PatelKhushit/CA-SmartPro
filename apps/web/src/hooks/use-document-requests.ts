import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  DocumentRequest,
  DocumentRequestItemStatus,
  DocumentRequestStatus,
  PaginatedResult,
} from "@/lib/types/document";
import type { ServiceCategory } from "@/lib/types/client";

export interface DocumentRequestFilters {
  clientId?: string;
  status?: DocumentRequestStatus;
  page?: number;
  pageSize?: number;
}

function buildQuery(filters: DocumentRequestFilters) {
  const params = new URLSearchParams();
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.status) params.set("status", filters.status);
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 20));
  return params.toString();
}

export function useDocumentRequests(filters: DocumentRequestFilters) {
  return useQuery({
    queryKey: ["document-requests", filters],
    queryFn: () => api.get<PaginatedResult<DocumentRequest>>(`/document-requests?${buildQuery(filters)}`),
  });
}

export function useDocumentRequest(id: string | undefined) {
  return useQuery({
    queryKey: ["document-requests", id],
    queryFn: () => api.get<DocumentRequest>(`/document-requests/${id}`),
    enabled: !!id,
  });
}

export function useDocumentRequestTemplates(category: ServiceCategory | undefined) {
  return useQuery({
    queryKey: ["document-request-templates", category],
    queryFn: () => api.get<{ category: ServiceCategory; items: string[] }>(`/document-requests/templates?category=${category}`),
    enabled: !!category,
  });
}

export interface CreateDocumentRequestInput {
  clientId: string;
  title: string;
  description?: string;
  dueDate?: string;
  items?: { label: string; isRequired?: boolean }[];
}

export function useCreateDocumentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDocumentRequestInput) => api.post<DocumentRequest>("/document-requests", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["document-requests"] });
    },
  });
}

// All mutations below invalidate the bare ["document-requests"] prefix
// rather than ["document-requests", requestId] — the list query's key is
// ["document-requests", filtersObject], which a requestId-suffixed key does
// NOT prefix-match in TanStack Query, so a narrower invalidation would leave
// the list view (used everywhere these mutations are triggered from) stale.

export function useCancelDocumentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<DocumentRequest>(`/document-requests/${id}/cancel`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["document-requests"] });
    },
  });
}

export function useAddDocumentRequestItem(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { label: string; isRequired?: boolean }) =>
      api.post<DocumentRequest>(`/document-requests/${requestId}/items`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["document-requests"] });
    },
  });
}

export function useRemoveDocumentRequestItem(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => api.delete<DocumentRequest>(`/document-requests/${requestId}/items/${itemId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["document-requests"] });
    },
  });
}

export function useFulfillDocumentRequestItem(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, documentId }: { itemId: string; documentId: string }) =>
      api.post<DocumentRequest>(`/document-requests/${requestId}/items/${itemId}/fulfill`, { documentId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["document-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useReviewDocumentRequestItem(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, status, notes }: { itemId: string; status: DocumentRequestItemStatus; notes?: string }) =>
      api.patch<DocumentRequest>(`/document-requests/${requestId}/items/${itemId}/review`, { status, notes }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["document-requests"] });
    },
  });
}
