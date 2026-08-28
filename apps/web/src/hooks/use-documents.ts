import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE_URL } from "@/lib/api-client";
import type { DocumentCategory, DocumentItem, DownloadLink, PaginatedResult } from "@/lib/types/document";

export interface DocumentListFilters {
  clientId?: string;
  category?: DocumentCategory;
  search?: string;
  page?: number;
  pageSize?: number;
}

function buildQuery(filters: DocumentListFilters) {
  const params = new URLSearchParams();
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.category) params.set("category", filters.category);
  if (filters.search) params.set("search", filters.search);
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 20));
  return params.toString();
}

export function useDocuments(filters: DocumentListFilters) {
  return useQuery({
    queryKey: ["documents", filters],
    queryFn: () => api.get<PaginatedResult<DocumentItem>>(`/documents?${buildQuery(filters)}`),
  });
}

export function useDocument(id: string | undefined) {
  return useQuery({
    queryKey: ["documents", id],
    queryFn: () => api.get<DocumentItem>(`/documents/${id}`),
    enabled: !!id,
  });
}

export interface UploadDocumentInput {
  file: File;
  title: string;
  category?: DocumentCategory;
  clientId?: string;
  description?: string;
}

function toFormData(input: UploadDocumentInput) {
  const formData = new FormData();
  formData.set("file", input.file);
  formData.set("title", input.title);
  if (input.category) formData.set("category", input.category);
  if (input.clientId) formData.set("clientId", input.clientId);
  if (input.description) formData.set("description", input.description);
  return formData;
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadDocumentInput) => api.upload<DocumentItem>("/documents", toFormData(input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useUploadDocumentVersion(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.set("file", file);
      return api.upload<DocumentItem>(`/documents/${documentId}/versions`, formData);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["documents", documentId] });
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useUpdateDocument(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { title?: string; category?: DocumentCategory; description?: string }) =>
      api.patch<DocumentItem>(`/documents/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["documents", id] });
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useArchiveDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/documents/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

/** Fetches a short-lived signed download link, then triggers the browser download via a direct navigation (the link itself carries the auth token, not a Bearer header). */
export async function downloadDocumentVersion(documentId: string, versionId: string) {
  const link = await api.post<DownloadLink>(`/documents/${documentId}/versions/${versionId}/download-link`);
  const url = `${API_BASE_URL}/documents/file?token=${encodeURIComponent(link.token)}`;
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = link.filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
