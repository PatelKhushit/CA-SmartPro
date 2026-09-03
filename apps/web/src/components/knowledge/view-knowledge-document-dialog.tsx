"use client";

import * as React from "react";
import { toast } from "sonner";
import { Eye, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useKnowledgeDocument, useUpdateKnowledgeDocument, useDeleteKnowledgeDocument } from "@/hooks/use-knowledge";
import { KNOWLEDGE_STATUS_LABELS, KNOWLEDGE_STATUS_VARIANT } from "@/lib/types/knowledge";
import { ApiClientError } from "@/lib/api-client";

export function ViewKnowledgeDocumentDialog({ documentId, canManage }: { documentId: string; canManage: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");

  const { data: doc, isLoading } = useKnowledgeDocument(open ? documentId : undefined);
  const updateDocument = useUpdateKnowledgeDocument();
  const deleteDocument = useDeleteKnowledgeDocument();

  const startEdit = () => {
    if (!doc) return;
    setTitle(doc.title);
    setContent(doc.content);
    setEditing(true);
  };

  const save = async () => {
    try {
      await updateDocument.mutateAsync({ id: documentId, title: title.trim(), content: content.trim() });
      toast.success("Document updated — re-generating embeddings.");
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't update this document.");
    }
  };

  const remove = async () => {
    try {
      await deleteDocument.mutateAsync(documentId);
      toast.success("Document deleted.");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't delete this document.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setEditing(false);
      }}
    >
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="View document">
          <Eye className="h-4 w-4 text-muted" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        {isLoading || !doc ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editing ? "Edit document" : doc.title}
                {!editing && <Badge variant={KNOWLEDGE_STATUS_VARIANT[doc.status]}>{KNOWLEDGE_STATUS_LABELS[doc.status]}</Badge>}
              </DialogTitle>
            </DialogHeader>
            {editing ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="kb-edit-title">Title</Label>
                  <Input id="kb-edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="kb-edit-content">Content</Label>
                  <Textarea id="kb-edit-content" rows={10} value={content} onChange={(e) => setContent(e.target.value)} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {doc.status === "FAILED" && doc.errorMessage && (
                  <p className="rounded-md bg-status-overdue-bg px-3 py-2 text-sm text-status-overdue">{doc.errorMessage}</p>
                )}
                <p className="max-h-96 overflow-y-auto whitespace-pre-wrap text-sm text-foreground">{doc.content}</p>
                <p className="text-xs text-muted">
                  {doc.chunks.length} chunk{doc.chunks.length === 1 ? "" : "s"} · added by {doc.createdBy.fullName}
                </p>
              </div>
            )}
            <DialogFooter className="justify-between sm:justify-between">
              {canManage && !editing && (
                <Button variant="ghost" className="text-status-overdue" onClick={remove} disabled={deleteDocument.isPending}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              )}
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <Button variant="outline" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                    <Button onClick={save} disabled={updateDocument.isPending}>
                      {updateDocument.isPending ? "Saving…" : "Save"}
                    </Button>
                  </>
                ) : (
                  canManage && <Button onClick={startEdit}>Edit</Button>
                )}
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
