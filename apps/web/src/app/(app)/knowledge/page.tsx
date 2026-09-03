"use client";

import * as React from "react";
import { toast } from "sonner";
import { BookOpen, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NewKnowledgeDocumentDialog } from "@/components/knowledge/new-knowledge-document-dialog";
import { ViewKnowledgeDocumentDialog } from "@/components/knowledge/view-knowledge-document-dialog";
import { useKnowledgeDocuments, useSearchKnowledgeBase } from "@/hooks/use-knowledge";
import { KNOWLEDGE_STATUS_LABELS, KNOWLEDGE_STATUS_VARIANT } from "@/lib/types/knowledge";
import { useAuth } from "@/lib/auth-context";
import { ApiClientError } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n/language-context";

export default function KnowledgeBasePage() {
  const { hasPermission } = useAuth();
  const { t } = useLanguage();
  const canManage = hasPermission("knowledge.manage");

  const [searchQuery, setSearchQuery] = React.useState("");
  const search = useSearchKnowledgeBase();

  const { data: documents, isLoading, isError, refetch } = useKnowledgeDocuments({});

  if (!hasPermission("knowledge.view")) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-foreground">{t("pages.knowledge.title")}</h1>
        <EmptyState icon={BookOpen} title="You don't have access to the Knowledge Base." description="Ask a Firm Admin or Manager to grant knowledge.view if you need this." />
      </div>
    );
  }

  const runSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      await search.mutateAsync(searchQuery.trim());
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Search failed.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("pages.knowledge.title")}</h1>
          <p className="text-sm text-muted">{t("pages.knowledge.description")}</p>
        </div>
        {canManage && <NewKnowledgeDocumentDialog />}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Ask the knowledge base something…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          className="max-w-md"
        />
        <Button variant="outline" onClick={runSearch} disabled={search.isPending || !searchQuery.trim()}>
          <Search className="h-4 w-4" /> {search.isPending ? "Searching…" : "Search"}
        </Button>
      </div>

      {search.data && (
        <div className="flex flex-col gap-2">
          {search.data.results.length === 0 ? (
            <p className="text-sm text-muted">No matching entries found.</p>
          ) : (
            search.data.results.map((r, i) => (
              <Card key={i}>
                <CardContent className="flex flex-col gap-1 pt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{r.documentTitle}</p>
                    <span className="text-xs text-muted">relevance {Math.round(r.score * 100)}%</span>
                  </div>
                  <p className="text-sm text-muted">{r.content}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-foreground">All documents</h2>
        {isLoading && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {isError && <ErrorState description="We couldn't load the knowledge base." onRetry={() => refetch()} />}
        {!isLoading && !isError && documents && documents.items.length === 0 && (
          <EmptyState icon={BookOpen} title="No documents yet." description="Add an SOP or internal note so the AI Copilot can search it." />
        )}
        {!isLoading && !isError && documents && documents.items.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Chunks</TableHead>
                <TableHead>Added by</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.items.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium text-foreground">{doc.title}</TableCell>
                  <TableCell>
                    <Badge variant={KNOWLEDGE_STATUS_VARIANT[doc.status]}>{KNOWLEDGE_STATUS_LABELS[doc.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted">{doc._count.chunks}</TableCell>
                  <TableCell className="text-muted">{doc.createdBy.fullName}</TableCell>
                  <TableCell>
                    <ViewKnowledgeDocumentDialog documentId={doc.id} canManage={canManage} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
