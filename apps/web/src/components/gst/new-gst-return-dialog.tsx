"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateGstReturn, useGstProfiles } from "@/hooks/use-gst";
import { useTeamMembers } from "@/hooks/use-team";
import { GST_RETURN_TYPE_LABELS, type GstReturnType } from "@/lib/types/gst";
import { ApiClientError } from "@/lib/api-client";

export function NewGstReturnDialog() {
  const [open, setOpen] = React.useState(false);
  const [gstProfileId, setGstProfileId] = React.useState("");
  const [returnType, setReturnType] = React.useState<GstReturnType>("GSTR3B");
  const [taxPeriod, setTaxPeriod] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [assignedUserId, setAssignedUserId] = React.useState("");

  const { data: profiles } = useGstProfiles();
  const { data: members } = useTeamMembers();
  const createReturn = useCreateGstReturn();

  const reset = () => { setGstProfileId(""); setReturnType("GSTR3B"); setTaxPeriod(""); setDueDate(""); setAssignedUserId(""); };
  const valid = gstProfileId && taxPeriod.trim() && dueDate;

  const submit = async () => {
    try {
      await createReturn.mutateAsync({ gstProfileId, returnType, taxPeriod: taxPeriod.trim(), dueDate, assignedUserId: assignedUserId || undefined });
      toast.success("Return added.");
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't add this return.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> New return
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a GST return</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ret-profile">GSTIN</Label>
            <Select value={gstProfileId} onValueChange={setGstProfileId}>
              <SelectTrigger id="ret-profile"><SelectValue placeholder="Select GSTIN" /></SelectTrigger>
              <SelectContent>
                {profiles?.map((p) => <SelectItem key={p.id} value={p.id}>{p.client.displayName} — {p.gstin}</SelectItem>)}
              </SelectContent>
            </Select>
            {profiles?.length === 0 && <p className="text-xs text-muted">No GST profiles yet — add a GSTIN first.</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ret-type">Return type</Label>
              <Select value={returnType} onValueChange={(v) => setReturnType(v as GstReturnType)}>
                <SelectTrigger id="ret-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(GST_RETURN_TYPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ret-period">Tax period</Label>
              <Input id="ret-period" placeholder="Aug-2026" value={taxPeriod} onChange={(e) => setTaxPeriod(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ret-due">Due date</Label>
            <Input id="ret-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ret-assignee">Assign to (optional)</Label>
            <Select value={assignedUserId} onValueChange={setAssignedUserId}>
              <SelectTrigger id="ret-assignee"><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                {members?.map((m) => <SelectItem key={m.id} value={m.id}>{m.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!valid || createReturn.isPending} onClick={submit}>
            {createReturn.isPending ? "Saving…" : "Add return"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
