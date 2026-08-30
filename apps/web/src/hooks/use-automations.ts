import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AutomationAction, AutomationExecution, AutomationRule, AutomationTriggerType, ClientActiveCondition } from "@/lib/types/automation";

export function useAutomationRules() {
  return useQuery({ queryKey: ["automations"], queryFn: () => api.get<AutomationRule[]>("/automations") });
}

export function useAutomationRule(id: string | undefined) {
  return useQuery({
    queryKey: ["automations", id],
    queryFn: () => api.get<AutomationRule>(`/automations/${id}`),
    enabled: !!id,
  });
}

export function useAutomationExecutions(ruleId?: string) {
  return useQuery({
    queryKey: ["automations", "executions", ruleId],
    queryFn: () => api.get<AutomationExecution[]>(`/automations/executions${ruleId ? `?ruleId=${ruleId}` : ""}`),
  });
}

export interface CreateAutomationInput {
  name: string;
  description?: string;
  triggerType: AutomationTriggerType;
  triggerConfig?: Record<string, unknown>;
  conditions?: ClientActiveCondition[];
  actions: AutomationAction[];
}

export function useCreateAutomationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAutomationInput) => api.post<AutomationRule>("/automations", input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["automations"] }),
  });
}

export function useUpdateAutomationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<CreateAutomationInput> & { isEnabled?: boolean }) =>
      api.patch<AutomationRule>(`/automations/${id}`, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["automations"] }),
  });
}

export function useSetAutomationEnabled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) =>
      api.post<{ message: string }>(`/automations/${id}/${isEnabled ? "enable" : "pause"}`, {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["automations"] }),
  });
}

export function useRunAutomationsNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ executionsCreated: number }>("/automations/run-now", {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["automations"] }),
  });
}
