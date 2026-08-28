import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  user: { fullName: string } | null;
}

export function useAuditLogs() {
  return useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => api.get<AuditLogEntry[]>("/audit-logs"),
  });
}
