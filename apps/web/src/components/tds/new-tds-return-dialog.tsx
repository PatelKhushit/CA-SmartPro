"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTdsReturn, useTdsProfiles } from "@/hooks/use-tds";
import { useTeamMembers } from "@/hooks/use-team";
import { TDS_RETURN_TYPE_LABELS } from "@/lib/types/tds";
import type { TdsReturnType } from "@/lib/types/tds";
import { ApiClientError } from "@/lib/api-client";

export function NewTdsReturnDialog() {
  const [open, setOpen] = React.useState(false);
  const [tdsProfileId, setTdsProfileId] = React.useState("");
  const [returnType, setReturnType] = React.useState<TdsReturnType>("FORM_26Q");
  const [quarter, setQuarter] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [assignedUserId, setAssignedUserId] = React.useState("");

  const { data: profiles } = useTdsProfiles();
  const { data: members } = useTeamMembers();
  const createReturn = useCreateTdsReturn();

  const reset = () => { setTdsProfileId(""); setReturnType("FORM_26Q"); setQuarter(""); setDueDate(""); setAssignedUserId(""); };
  const valid = tdsProfileId && quarter.trim() && dueDate;

  const submit = async () => {
    try {
      await createReturn.mutateAsync({ tdsProfileId, returnType, quarter: quarter.trim(), dueDate, assignedUserId: assignedUserId || undefined });
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
          <DialogTitle>Add a TDS return</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tret-profile">TAN</Label>
            <Select value={tdsProfileId} onValueChange={setTdsProfileId}>
              <SelectTrigger id="tret-profile"><SelectValue placeholder="Select TAN" /></SelectTrigger>
              <SelectContent>
                {profiles?.map((p) => <SelectItem key={p.id} value={p.id}>{p.client.displayName} — {p.tan}</SelectItem>)}
              </SelectContent>
            </Select>
            {profiles?.length === 0 && <p className="text-xs text-muted">No TANs yet — add one first.</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tret-type">Return type</Label>
              <Select value={returnType} onValueChange={(v) => setReturnType(v as TdsReturnType)}>
                <SelectTrigger id="tret-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TDS_RETURN_TYPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tret-quarter">Quarter</Label>
              <Input id="tret-quarter" placeholder="Q2 FY2026-27" value={quarter} onChange={(e) => setQuarter(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tret-due">Due date</Label>
            <Input id="tret-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tret-assignee">Assign to (optional)</Label>
            <Select value={assignedUserId} onValueChange={setAssignedUserId}>
              <SelectTrigger id="tret-assignee"><SelectValue placeholder="Unassigned" /></SelectTrigger>
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
