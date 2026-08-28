"use client";

import * as React from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUploadDocument } from "@/hooks/use-documents";
import { useClients } from "@/hooks/use-clients";
import { DOCUMENT_CATEGORY_LABELS, type DocumentCategory, type DocumentItem } from "@/lib/types/document";
import { ApiClientError } from "@/lib/api-client";

interface UploadDocumentDialogProps {
  /** Fixed client (used from Client 360). Omit to show a client picker. */
  clientId?: string;
  defaultTitle?: string;
  defaultCategory?: DocumentCategory;
  trigger?: React.ReactNode;
  onUploaded?: (doc: DocumentItem) => void;
}

export function UploadDocumentDialog({
  clientId,
  defaultTitle,
  defaultCategory,
  trigger,
  onUploaded,
}: UploadDocumentDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [title, setTitle] = React.useState(defaultTitle ?? "");
  const [category, setCategory] = React.useState<DocumentCategory>(defaultCategory ?? "OTHER");
  const [selectedClientId, setSelectedClientId] = React.useState(clientId ?? "");
  const { data: clients } = useClients({ pageSize: 100 });
  const upload = useUploadDocument();

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setTitle(defaultTitle ?? "");
      setCategory(defaultCategory ?? "OTHER");
      setSelectedClientId(clientId ?? "");
      setFile(null);
    }
  };

  const submit = async () => {
    if (!file) return;
    try {
      const doc = await upload.mutateAsync({
        file,
        title: title || file.name,
        category,
        clientId: selectedClientId || undefined,
      });
      toast.success("Document uploaded.");
      setOpen(false);
      onUploaded?.(doc);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't upload this document.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Upload className="h-4 w-4" /> Upload
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload a document</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-file">File</Label>
            <input
              id="doc-file"
              type="file"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !title) setTitle(f.name.replace(/\.[^/.]+$/, ""));
              }}
              className="rounded-lg border border-border bg-surface text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted-surface file:px-3 file:py-1.5 file:text-sm file:font-medium"
            />
            <p className="text-xs text-muted">PDF, images, Office documents, or CSV — up to 20MB.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-title">Title</Label>
            <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-category">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
              <SelectTrigger id="doc-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!clientId && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="doc-client">Client (optional)</Label>
              <Select
                value={selectedClientId || "none"}
                onValueChange={(v) => setSelectedClientId(v === "none" ? "" : v)}
              >
                <SelectTrigger id="doc-client">
                  <SelectValue placeholder="Firm-internal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Firm-internal (no client)</SelectItem>
                  {clients?.items.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!file || !title || upload.isPending} onClick={submit}>
            {upload.isPending ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
