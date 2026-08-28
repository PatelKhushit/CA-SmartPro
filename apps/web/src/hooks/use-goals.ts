import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface Goal {
  id: string;
  userId: string | null;
  type: "DAILY_PRODUCTIVITY" | "WEEKLY_PRODUCTIVITY" | "MONTHLY_PRODUCTIVITY" | "COMPLIANCE" | "CLIENT_FOLLOW_UP";
  unit: "PERCENT" | "COUNT";
  targetValue: string;
  periodStart: string;
  periodEnd: string;
  currentValue: number;
  dataAvailable: boolean;
}

export function useGoals() {
  return useQuery({
    queryKey: ["goals"],
    queryFn: () => api.get<Goal[]>("/goals"),
  });
}

export interface CreateGoalInput {
  type: string;
  unit?: string;
  targetValue: number;
  periodStart: string;
  periodEnd: string;
  personal?: boolean;
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGoalInput) => api.post<Goal>("/goals", input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/goals/${id}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["goals"] }),
  });
}
