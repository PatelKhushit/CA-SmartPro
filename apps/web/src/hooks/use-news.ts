import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { NewsCategory, NewsListResult } from "@/lib/types/news";

export interface NewsFilters {
  category?: NewsCategory;
  search?: string;
}

function buildQuery(filters: NewsFilters) {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.search) params.set("search", filters.search);
  return params.toString();
}

export function useNews(filters: NewsFilters) {
  const qs = buildQuery(filters);
  return useQuery({
    queryKey: ["news", filters],
    queryFn: () => api.get<NewsListResult>(`/news${qs ? `?${qs}` : ""}`),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRefreshNews() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<NewsListResult>("/news/refresh", {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["news"] }),
  });
}
