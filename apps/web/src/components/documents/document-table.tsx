"use client";

import { format } from "date-fns";
import { Download, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useArchiveDocument, downloadDocumentVersion } from "@/hooks/use-documents";
import { DOCUMENT_CATEGORY_LABELS, type DocumentItem } from "@/lib/types/document";
import { useAuth } from "@/lib/auth-context";
import { ApiClientError } from "@/lib/api-client";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentTable({ documents, showClient = true }: { documents: DocumentItem[]; showClient?: boolean }) {
  const { hasPermission } = useAuth();
  const archiveDocument = useArchiveDocument();

  const archive = async (id: string) => {
    try {
      await archiveDocument.mutateAsync(id);
      toast.success("Document archived.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't archive this document.");
    }
  };

  const download = async (doc: DocumentItem) => {
    const latest = doc.versions[0];
    if (!latest) return;
    try {
      await downloadDocumentVersion(doc.id, latest.id);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't start the download.");
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Document</TableHead>
          {showClient && <TableHead>Client</TableHead>}
          <TableHead>Category</TableHead>
          <TableHead>Latest file</TableHead>
          <TableHead>Uploaded by</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc) => {
          const latest = doc.versions[0];
          return (
            <TableRow key={doc.id}>
              <TableCell>
                <p className="font-medium text-foreground">{doc.title}</p>
                {doc._count && doc._count.versions > 1 && (
                  <p className="text-xs text-muted">{doc._count.versions} versions</p>
                )}
              </TableCell>
              {showClient && (
                <TableCell className="text-muted">{doc.client?.displayName ?? "Firm-internal"}</TableCell>
              )}
              <TableCell>
                <Badge variant="neutral">{DOCUMENT_CATEGORY_LABELS[doc.category]}</Badge>
              </TableCell>
              <TableCell className="text-muted">
                {latest ? (
                  <>
                    <p className="max-w-[220px] truncate">{latest.originalFilename}</p>
                    <p className="text-xs">
                      {formatSize(latest.sizeBytes)} · {format(new Date(latest.createdAt), "d MMM yyyy")}
                    </p>
                  </>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-muted">{doc.uploadedBy.fullName}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Document actions">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => download(doc)} disabled={!latest}>
                      <Download className="mr-2 h-4 w-4" /> Download latest
                    </DropdownMenuItem>
                    {hasPermission("documents.delete") && (
                      <DropdownMenuItem onSelect={() => archive(doc.id)} className="text-status-overdue">
                        <Trash2 className="mr-2 h-4 w-4" /> Archive
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
