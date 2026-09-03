import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  beforeValue: unknown;
  afterValue: unknown;
  metadata: unknown;
  createdAt: string;
  user: { fullName: string } | null;
}

export function useAuditLogs(take?: number) {
  return useQuery({
    queryKey: ["audit-logs", take],
    queryFn: () => api.get<AuditLogEntry[]>(`/audit-logs${take ? `?take=${take}` : ""}`),
  });
}
