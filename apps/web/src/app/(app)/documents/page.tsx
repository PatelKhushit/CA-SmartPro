"use client";

import * as React from "react";
import { FileText } from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useDocuments } from "@/hooks/use-documents";
import { useClients } from "@/hooks/use-clients";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { DocumentTable } from "@/components/documents/document-table";
import { UploadDocumentDialog } from "@/components/documents/upload-document-dialog";
import { DOCUMENT_CATEGORY_LABELS, type DocumentCategory } from "@/lib/types/document";

export default function DocumentsPage() {
  const [search, setSearch] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [category, setCategory] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const { data: clients } = useClients({ pageSize: 100 });
  const { data, isLoading, isError, refetch } = useDocuments({
    search: debouncedSearch || undefined,
    clientId: clientId || undefined,
    category: (category || undefined) as DocumentCategory | undefined,
  });

  const hasFilters = !!(search || clientId || category);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Documents</h1>
          <p className="text-sm text-muted">Every file your firm holds for clients and internal work, privately stored.</p>
        </div>
        <UploadDocumentDialog />
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={clientId || "all"} onValueChange={(v) => setClientId(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {clients?.items.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <ErrorState
          description="We couldn't load documents. Please check your connection and try again."
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState
          icon={FileText}
          title={hasFilters ? "No documents match your filters." : "No documents yet."}
          description={hasFilters ? "Try different filters." : "Upload your first document to get started."}
        />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && <DocumentTable documents={data.items} />}
    </div>
  );
}
