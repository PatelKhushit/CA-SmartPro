"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
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
import { useCreateDocumentRequest } from "@/hooks/use-document-requests";
import { api } from "@/lib/api-client";
import { SERVICE_CATEGORY_LABELS, type ServiceCategory } from "@/lib/types/client";
import { ApiClientError } from "@/lib/api-client";

export function NewDocumentRequestDialog({ clientId }: { clientId: string }) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [templateCategory, setTemplateCategory] = React.useState<ServiceCategory | undefined>(undefined);
  const [items, setItems] = React.useState<string[]>([]);
  const [newItem, setNewItem] = React.useState("");
  const queryClient = useQueryClient();
  const createRequest = useCreateDocumentRequest();

  // Fetched imperatively (not via a reactive query + effect) so applying a
  // template is a one-time action triggered by the select, not something
  // that re-syncs state whenever the query result changes.
  const applyTemplate = async (value: string) => {
    if (value === "none") {
      setTemplateCategory(undefined);
      return;
    }
    const category = value as ServiceCategory;
    setTemplateCategory(category);
    const template = await queryClient.fetchQuery({
      queryKey: ["document-request-templates", category],
      queryFn: () => api.get<{ category: ServiceCategory; items: string[] }>(`/document-requests/templates?category=${category}`),
    });
    setItems(template.items);
  };

  const reset = () => {
    setTitle("");
    setDueDate("");
    setTemplateCategory(undefined);
    setItems([]);
    setNewItem("");
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    setItems([...items, newItem.trim()]);
    setNewItem("");
  };

  const submit = async () => {
    try {
      await createRequest.mutateAsync({
        clientId,
        title,
        dueDate: dueDate || undefined,
        items: items.map((label) => ({ label, isRequired: true })),
      });
      toast.success("Document request created.");
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't create this document request.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> New request
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request documents</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="req-title">Title</Label>
            <Input
              id="req-title"
              placeholder="FY 2025-26 ITR documents"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="req-due">Due date (optional)</Label>
            <Input id="req-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="req-template">Start from a checklist template (optional)</Label>
            <Select value={templateCategory ?? "none"} onValueChange={applyTemplate}>
              <SelectTrigger id="req-template">
                <SelectValue placeholder="Blank checklist" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Blank checklist</SelectItem>
                {Object.entries(SERVICE_CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Checklist items</Label>
            {items.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm">
                    <span className="flex-1">{item}</span>
                    <button
                      type="button"
                      onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                      aria-label={`Remove ${item}`}
                    >
                      <X className="h-3.5 w-3.5 text-muted" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Add a checklist item…"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem();
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                Add
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!title || createRequest.isPending} onClick={submit}>
            {createRequest.isPending ? "Creating…" : "Create request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
