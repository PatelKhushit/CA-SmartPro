"use client";

import { FileText } from "lucide-react";
import { useDocuments } from "@/hooks/use-documents";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { DocumentTable } from "./document-table";
import { UploadDocumentDialog } from "./upload-document-dialog";

export function ClientDocumentsPanel({ clientId }: { clientId: string }) {
  const { data, isLoading, isError, refetch } = useDocuments({ clientId, pageSize: 50 });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <UploadDocumentDialog clientId={clientId} />
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {isError && <ErrorState description="We couldn't load this client's documents." onRetry={() => refetch()} />}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState icon={FileText} title="No documents yet." description="Upload the first document for this client." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <DocumentTable documents={data.items} showClient={false} />
      )}
    </div>
  );
}
