"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateUdin } from "@/hooks/use-udin";
import { useClients } from "@/hooks/use-clients";
import { useTeamMembers } from "@/hooks/use-team";
import { UDIN_DOCUMENT_TYPE_LABELS, type UDINDocumentType } from "@/lib/types/udin";
import { ApiClientError } from "@/lib/api-client";

export function NewUdinDialog() {
  const [open, setOpen] = React.useState(false);
  const [clientId, setClientId] = React.useState("");
  const [documentType, setDocumentType] = React.useState<UDINDocumentType>("CERTIFICATE");
  const [documentDate, setDocumentDate] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [assignedUserId, setAssignedUserId] = React.useState("");

  const { data: clients } = useClients({ pageSize: 100 });
  const { data: members } = useTeamMembers();
  const createUdin = useCreateUdin();

  const reset = () => {
    setClientId("");
    setDocumentType("CERTIFICATE");
    setDocumentDate("");
    setDescription("");
    setAssignedUserId("");
  };

  const valid = clientId && documentDate;

  const submit = async () => {
    try {
      await createUdin.mutateAsync({
        clientId,
        documentType,
        documentDate,
        description: description.trim() || undefined,
        assignedUserId: assignedUserId || undefined,
      });
      toast.success("UDIN entry created.");
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't create this entry.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> New UDIN entry
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Track a new UDIN entry</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="udin-client">Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="udin-client"><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients?.items.map((c) => <SelectItem key={c.id} value={c.id}>{c.displayName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="udin-type">Document type</Label>
              <Select value={documentType} onValueChange={(v) => setDocumentType(v as UDINDocumentType)}>
                <SelectTrigger id="udin-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(UDIN_DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="udin-date">Document date</Label>
              <Input id="udin-date" type="date" value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="udin-desc">Description (optional)</Label>
            <Input id="udin-desc" placeholder="Tax audit report — FY 2025-26" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="udin-assignee">Assign to (optional)</Label>
            <Select value={assignedUserId} onValueChange={setAssignedUserId}>
              <SelectTrigger id="udin-assignee"><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                {members?.map((m) => <SelectItem key={m.id} value={m.id}>{m.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!valid || createUdin.isPending} onClick={submit}>
            {createUdin.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
