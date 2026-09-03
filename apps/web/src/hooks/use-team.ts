import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
  role: { key: string; name: string };
  lastLoginAt: string | null;
  assignedClients: number;
  workload: {
    assigned: number;
    completed: number;
    pending: number;
    overdue: number;
    completionPercent: number | null;
  };
}

export interface TeamSummary {
  total: number;
  active: number;
  inactive: number;
  pendingInvitations: number;
}

export interface TeamRole {
  id: string;
  key: string;
  name: string;
  description: string | null;
}

export function useTeamSummary() {
  return useQuery({ queryKey: ["team", "summary"], queryFn: () => api.get<TeamSummary>("/team/summary") });
}

export function useTeamMembers(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["team"],
    queryFn: () => api.get<TeamMember[]>("/team"),
    enabled: options.enabled ?? true,
  });
}

export function useTeamRoles() {
  return useQuery({ queryKey: ["team", "roles"], queryFn: () => api.get<TeamRole[]>("/team/roles") });
}

export interface InviteMemberResult {
  id: string;
  email: string;
  fullName: string;
  status: string;
  message: string;
  devOnlyInviteToken?: string;
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; fullName: string; roleKey: string }) =>
      api.post<InviteMemberResult>("/team/invite", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["team"] });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; roleKey?: string; status?: "ACTIVE" | "SUSPENDED" }) =>
      api.patch<{ message: string }>(`/team/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["team"] });
    },
  });
}
