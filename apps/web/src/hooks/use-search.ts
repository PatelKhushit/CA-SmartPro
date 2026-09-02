import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface SearchResultClient {
  id: string;
  title: string;
  subtitle: string | null;
}

export interface SearchResultTask {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  dueDate: string | null;
}

export interface SearchResults {
  clients: SearchResultClient[];
  tasks: SearchResultTask[];
}

const MIN_QUERY_LENGTH = 2;

export function useGlobalSearch(term: string) {
  const trimmed = term.trim();
  return useQuery({
    queryKey: ["search", trimmed],
    queryFn: () => api.get<SearchResults>(`/search?q=${encodeURIComponent(trimmed)}`),
    enabled: trimmed.length >= MIN_QUERY_LENGTH,
  });
}
