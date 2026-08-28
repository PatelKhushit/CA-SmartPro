"use client";

import { ClipboardList } from "lucide-react";
import { useDocumentRequests } from "@/hooks/use-document-requests";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { DocumentRequestCard } from "@/components/document-requests/document-request-card";

export default function DocumentRequestsPage() {
  const { data, isLoading, isError, refetch } = useDocumentRequests({ pageSize: 50 });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Document Requests</h1>
        <p className="text-sm text-muted">Every document checklist your firm has sent to a client, across all clients.</p>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      )}

      {isError && <ErrorState description="We couldn't load document requests." onRetry={() => refetch()} />}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title="No document requests yet."
          description="Open a client's profile and create a document request to get started."
        />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.items.map((request) => (
            <DocumentRequestCard key={request.id} request={request} showClient />
          ))}
        </div>
      )}
    </div>
  );
}
