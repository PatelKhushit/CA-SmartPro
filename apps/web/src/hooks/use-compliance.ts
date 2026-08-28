import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface ComplianceRule {
  id: string;
  name: string;
  category: string;
  frequency: string;
  description: string | null;
  dueDayOfPeriod: number;
  applicableServiceType: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  source: string;
  sourceUrl: string | null;
  verifiedAt: string | null;
  status: "DRAFT" | "ACTIVE" | "RETIRED";
}

export function useComplianceRules() {
  return useQuery({
    queryKey: ["compliance-rules"],
    queryFn: () => api.get<ComplianceRule[]>("/compliance-rules"),
  });
}

export interface CreateComplianceRuleInput {
  name: string;
  category: string;
  frequency: string;
  dueDayOfPeriod: number;
  effectiveFrom: string;
  source: string;
  sourceUrl?: string;
  applicableServiceType?: string;
  description?: string;
}

export function useCreateComplianceRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateComplianceRuleInput) => api.post<ComplianceRule>("/compliance-rules", input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["compliance-rules"] }),
  });
}

export function useVerifyComplianceRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<ComplianceRule>(`/compliance-rules/${id}/verify`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["compliance-rules"] }),
  });
}

export function useRetireComplianceRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<{ message: string }>(`/compliance-rules/${id}/retire`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["compliance-rules"] }),
  });
}
