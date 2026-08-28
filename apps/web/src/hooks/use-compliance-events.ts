import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ServiceCategory } from "@/lib/types/client";

export type ComplianceEventStatus = "UPCOMING" | "DUE" | "OVERDUE" | "COMPLETED" | "WAIVED";

export interface ComplianceEvent {
  id: string;
  clientId: string;
  client: { id: string; displayName: string; clientCode: string };
  complianceRuleId: string;
  complianceRule: {
    id: string;
    name: string;
    category: ServiceCategory;
    source: string;
    sourceUrl: string | null;
    verifiedAt: string | null;
  };
  periodKey: string;
  dueDate: string;
  status: ComplianceEventStatus;
  completedAt: string | null;
}

export interface ComplianceEventFilters {
  clientId?: string;
  status?: ComplianceEventStatus;
  dueBefore?: string;
  dueAfter?: string;
}

function buildQuery(filters: ComplianceEventFilters) {
  const params = new URLSearchParams();
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.status) params.set("status", filters.status);
  if (filters.dueBefore) params.set("dueBefore", filters.dueBefore);
  if (filters.dueAfter) params.set("dueAfter", filters.dueAfter);
  return params.toString();
}

export function useComplianceEvents(filters: ComplianceEventFilters) {
  return useQuery({
    queryKey: ["compliance-events", filters],
    queryFn: () => api.get<ComplianceEvent[]>(`/compliance-events?${buildQuery(filters)}`),
  });
}

export function useCompleteComplianceEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<ComplianceEvent>(`/compliance-events/${id}/complete`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["compliance-events"] }),
  });
}

export function useWaiveComplianceEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<ComplianceEvent>(`/compliance-events/${id}/waive`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["compliance-events"] }),
  });
}
