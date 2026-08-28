"use client";

import { ClipboardList } from "lucide-react";
import { useDocumentRequests } from "@/hooks/use-document-requests";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { NewDocumentRequestDialog } from "./new-document-request-dialog";
import { DocumentRequestCard } from "./document-request-card";
import { useAuth } from "@/lib/auth-context";

export function ClientDocumentRequestsPanel({ clientId }: { clientId: string }) {
  const { hasPermission } = useAuth();
  const { data, isLoading, isError, refetch } = useDocumentRequests({ clientId, pageSize: 50 });

  return (
    <div className="flex flex-col gap-4">
      {hasPermission("document_requests.manage") && (
        <div className="flex justify-end">
          <NewDocumentRequestDialog clientId={clientId} />
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      )}

      {isError && <ErrorState description="We couldn't load document requests for this client." onRetry={() => refetch()} />}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title="No document requests yet."
          description="Ask this client for the documents you need with a checklist they can work through."
        />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.items.map((request) => (
            <DocumentRequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}
