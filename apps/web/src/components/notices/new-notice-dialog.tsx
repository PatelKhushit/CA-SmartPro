"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateNotice } from "@/hooks/use-notices";
import { useClients } from "@/hooks/use-clients";
import { useTeamMembers } from "@/hooks/use-team";
import { SERVICE_CATEGORY_LABELS, type ServiceCategory } from "@/lib/types/client";
import type { NoticePriority } from "@/lib/types/notice";
import { ApiClientError } from "@/lib/api-client";

const PRIORITIES: NoticePriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export function NewNoticeDialog() {
  const [open, setOpen] = React.useState(false);
  const [clientId, setClientId] = React.useState("");
  const [department, setDepartment] = React.useState<ServiceCategory | "">("");
  const [noticeType, setNoticeType] = React.useState("");
  const [referenceNumber, setReferenceNumber] = React.useState("");
  const [noticeDate, setNoticeDate] = React.useState("");
  const [responseDeadline, setResponseDeadline] = React.useState("");
  const [assignedUserId, setAssignedUserId] = React.useState("");
  const [priority, setPriority] = React.useState<NoticePriority>("MEDIUM");
  const [description, setDescription] = React.useState("");

  const { data: clients } = useClients({ pageSize: 100 });
  const { data: members } = useTeamMembers();
  const createNotice = useCreateNotice();

  const reset = () => {
    setClientId("");
    setDepartment("");
    setNoticeType("");
    setReferenceNumber("");
    setNoticeDate("");
    setResponseDeadline("");
    setAssignedUserId("");
    setPriority("MEDIUM");
    setDescription("");
  };

  const valid = clientId && noticeType.trim() && referenceNumber.trim() && noticeDate;

  const submit = async () => {
    try {
      await createNotice.mutateAsync({
        clientId,
        department: department || undefined,
        noticeType: noticeType.trim(),
        referenceNumber: referenceNumber.trim(),
        noticeDate,
        responseDeadline: responseDeadline || undefined,
        assignedUserId: assignedUserId || undefined,
        priority,
        description: description.trim() || undefined,
      });
      toast.success("Notice logged.");
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't log this notice.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> Log notice
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a government notice</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notice-client">Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="notice-client"><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients?.items.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notice-dept">Department</Label>
              <Select value={department} onValueChange={(v) => setDepartment(v as ServiceCategory)}>
                <SelectTrigger id="notice-dept"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SERVICE_CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notice-priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as NoticePriority)}>
                <SelectTrigger id="notice-priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notice-type">Notice type</Label>
            <Input id="notice-type" placeholder="GST ASMT-10, Income Tax 143(1)…" value={noticeType} onChange={(e) => setNoticeType(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notice-ref">Reference number</Label>
            <Input id="notice-ref" placeholder="Notice / DIN reference" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notice-date">Notice date</Label>
              <Input id="notice-date" type="date" value={noticeDate} onChange={(e) => setNoticeDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notice-deadline">Response deadline</Label>
              <Input id="notice-deadline" type="date" value={responseDeadline} onChange={(e) => setResponseDeadline(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notice-assignee">Assign to (optional)</Label>
            <Select value={assignedUserId} onValueChange={setAssignedUserId}>
              <SelectTrigger id="notice-assignee"><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                {members?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notice-desc">Description (optional)</Label>
            <textarea
              id="notice-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What does the notice require?"
              className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!valid || createNotice.isPending} onClick={submit}>
            {createNotice.isPending ? "Logging…" : "Log notice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
