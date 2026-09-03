"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateItrReturn } from "@/hooks/use-itr";
import { useClients } from "@/hooks/use-clients";
import { useTeamMembers } from "@/hooks/use-team";
import { useAuth } from "@/lib/auth-context";
import { ITR_FORM_TYPE_LABELS, type ItrFormType } from "@/lib/types/itr";
import { ApiClientError } from "@/lib/api-client";

export function NewItrReturnDialog() {
  const [open, setOpen] = React.useState(false);
  const [clientId, setClientId] = React.useState("");
  const [assessmentYear, setAssessmentYear] = React.useState("");
  const [formType, setFormType] = React.useState<ItrFormType>("ITR_1");
  const [dueDate, setDueDate] = React.useState("");
  const [assignedUserId, setAssignedUserId] = React.useState("");
  const [reviewerUserId, setReviewerUserId] = React.useState("");

  const { hasPermission } = useAuth();
  const { data: clients } = useClients({ pageSize: 100 });
  const { data: members } = useTeamMembers({ enabled: open && hasPermission("team.manage") });
  const createReturn = useCreateItrReturn();

  const reset = () => {
    setClientId("");
    setAssessmentYear("");
    setFormType("ITR_1");
    setDueDate("");
    setAssignedUserId("");
    setReviewerUserId("");
  };
  const valid = clientId && assessmentYear.trim() && dueDate;

  const submit = async () => {
    try {
      await createReturn.mutateAsync({
        clientId,
        assessmentYear: assessmentYear.trim(),
        formType,
        dueDate,
        assignedUserId: assignedUserId || undefined,
        reviewerUserId: reviewerUserId || undefined,
      });
      toast.success("ITR return added.");
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't add this return.");
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
          <Plus className="h-4 w-4" /> New return
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add an ITR return</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="itr-client">Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="itr-client">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients?.items.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.displayName}
                    {c.pan ? ` — ${c.pan}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="itr-form-type">ITR type</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as ItrFormType)}>
                <SelectTrigger id="itr-form-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ITR_FORM_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="itr-ay">Assessment year</Label>
              <Input id="itr-ay" placeholder="2026-27" value={assessmentYear} onChange={(e) => setAssessmentYear(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="itr-due">Due date</Label>
            <Input id="itr-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="itr-assignee">Assign to (optional)</Label>
              <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                <SelectTrigger id="itr-assignee">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {members?.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="itr-reviewer">Reviewer (optional)</Label>
              <Select value={reviewerUserId} onValueChange={setReviewerUserId}>
                <SelectTrigger id="itr-reviewer">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {members?.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!valid || createReturn.isPending} onClick={submit}>
            {createReturn.isPending ? "Saving…" : "Add return"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
