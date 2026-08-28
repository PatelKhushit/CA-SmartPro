"use client";

import { format } from "date-fns";
import { Check, MoreHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UploadDocumentDialog } from "@/components/documents/upload-document-dialog";
import {
  useCancelDocumentRequest,
  useFulfillDocumentRequestItem,
  useReviewDocumentRequestItem,
} from "@/hooks/use-document-requests";
import { DOCUMENT_REQUEST_STATUS_LABELS, type DocumentRequest, type DocumentRequestItem } from "@/lib/types/document";
import { useAuth } from "@/lib/auth-context";
import { ApiClientError } from "@/lib/api-client";

const REQUEST_STATUS_VARIANT = {
  PENDING: "upcoming",
  PARTIAL: "attention",
  FULFILLED: "completed",
  CANCELLED: "cancelled",
} as const;

const ITEM_STATUS_VARIANT = {
  PENDING: "upcoming",
  UPLOADED: "inProgress",
  APPROVED: "completed",
  REJECTED: "overdue",
} as const;

function ChecklistItemRow({ request, item }: { request: DocumentRequest; item: DocumentRequestItem }) {
  const { hasPermission } = useAuth();
  const fulfill = useFulfillDocumentRequestItem(request.id);
  const review = useReviewDocumentRequestItem(request.id);

  const onUploaded = async (doc: { id: string }) => {
    try {
      await fulfill.mutateAsync({ itemId: item.id, documentId: doc.id });
      toast.success("Document linked to checklist item.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't link this document.");
    }
  };

  const setReview = async (status: "APPROVED" | "REJECTED") => {
    try {
      await review.mutateAsync({ itemId: item.id, status });
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't update this item.");
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {item.label} {!item.isRequired && <span className="text-xs font-normal text-muted">(optional)</span>}
        </p>
        {item.document && <p className="truncate text-xs text-muted">Linked: {item.document.title}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={ITEM_STATUS_VARIANT[item.status]}>{item.status}</Badge>
        {item.status === "PENDING" && hasPermission("documents.upload") && (
          <UploadDocumentDialog
            clientId={request.clientId}
            defaultTitle={item.label}
            trigger={
              <Button size="sm" variant="outline">
                Upload
              </Button>
            }
            onUploaded={onUploaded}
          />
        )}
        {item.status === "UPLOADED" && hasPermission("document_requests.manage") && (
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" aria-label="Approve" onClick={() => setReview("APPROVED")}>
              <Check className="h-4 w-4 text-status-completed" />
            </Button>
            <Button size="icon" variant="ghost" aria-label="Reject" onClick={() => setReview("REJECTED")}>
              <X className="h-4 w-4 text-status-overdue" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function DocumentRequestCard({ request, showClient = false }: { request: DocumentRequest; showClient?: boolean }) {
  const { hasPermission } = useAuth();
  const cancelRequest = useCancelDocumentRequest();

  const cancel = async () => {
    try {
      await cancelRequest.mutateAsync(request.id);
      toast.success("Document request cancelled.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't cancel this request.");
    }
  };

  const canCancel =
    hasPermission("document_requests.manage") && request.status !== "CANCELLED" && request.status !== "FULFILLED";

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">
            {request.title}
            {showClient && <span className="ml-2 font-normal text-muted">· {request.client.displayName}</span>}
          </CardTitle>
          <p className="mt-1 text-xs text-muted">
            {request.dueDate ? `Due ${format(new Date(request.dueDate), "d MMM yyyy")}` : "No due date"} · Requested by{" "}
            {request.createdBy.fullName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={REQUEST_STATUS_VARIANT[request.status]}>{DOCUMENT_REQUEST_STATUS_LABELS[request.status]}</Badge>
          {canCancel && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Request actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={cancel} className="text-status-overdue">
                  Cancel request
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {request.description && <p className="text-sm text-muted">{request.description}</p>}
        {request.items.length === 0 ? (
          <p className="text-sm text-muted">No checklist items.</p>
        ) : (
          request.items.map((item) => <ChecklistItemRow key={item.id} request={request} item={item} />)
        )}
      </CardContent>
    </Card>
  );
}
