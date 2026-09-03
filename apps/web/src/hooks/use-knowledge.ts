import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { PaginatedResult } from "@/lib/types/client";
import type { KnowledgeDocumentDetail, KnowledgeDocumentListItem, KnowledgeSearchResult } from "@/lib/types/knowledge";

export interface KnowledgeFilters {
  search?: string;
  page?: number;
  pageSize?: number;
}

function buildQuery(filters: KnowledgeFilters) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 20));
  return params.toString();
}

export function useKnowledgeDocuments(filters: KnowledgeFilters) {
  return useQuery({
    queryKey: ["knowledge", "documents", filters],
    queryFn: () => api.get<PaginatedResult<KnowledgeDocumentListItem>>(`/knowledge?${buildQuery(filters)}`),
    // Documents embed asynchronously (a real Gemini API call) — poll while any are still PROCESSING.
    refetchInterval: (query) => (query.state.data?.items.some((d) => d.status === "PROCESSING") ? 2000 : false),
  });
}

export function useKnowledgeDocument(id: string | undefined) {
  return useQuery({
    queryKey: ["knowledge", "documents", id],
    queryFn: () => api.get<KnowledgeDocumentDetail>(`/knowledge/${id}`),
    enabled: !!id,
  });
}

export function useCreateKnowledgeDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; content: string }) => api.post<KnowledgeDocumentDetail>("/knowledge", input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["knowledge"] }),
  });
}

export function useUpdateKnowledgeDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; title?: string; content?: string }) => api.patch<KnowledgeDocumentDetail>(`/knowledge/${id}`, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["knowledge"] }),
  });
}

export function useDeleteKnowledgeDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/knowledge/${id}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["knowledge"] }),
  });
}

export function useSearchKnowledgeBase() {
  return useMutation({
    mutationFn: (query: string) => api.get<{ results: KnowledgeSearchResult[] }>(`/knowledge/search?query=${encodeURIComponent(query)}`),
  });
}
