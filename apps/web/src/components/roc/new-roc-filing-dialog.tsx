"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateRocFiling } from "@/hooks/use-roc";
import { useClients } from "@/hooks/use-clients";
import { useTeamMembers } from "@/hooks/use-team";
import { useAuth } from "@/lib/auth-context";
import { ROC_FORM_TYPE_LABELS, type RocFormType } from "@/lib/types/roc";
import { ApiClientError } from "@/lib/api-client";

export function NewRocFilingDialog() {
  const [open, setOpen] = React.useState(false);
  const [clientId, setClientId] = React.useState("");
  const [financialYear, setFinancialYear] = React.useState("");
  const [formType, setFormType] = React.useState<RocFormType>("AOC_4");
  const [dueDate, setDueDate] = React.useState("");
  const [assignedUserId, setAssignedUserId] = React.useState("");

  const { hasPermission } = useAuth();
  const { data: clients } = useClients({ pageSize: 100 });
  const { data: members } = useTeamMembers({ enabled: open && hasPermission("team.manage") });
  const createFiling = useCreateRocFiling();

  const reset = () => {
    setClientId("");
    setFinancialYear("");
    setFormType("AOC_4");
    setDueDate("");
    setAssignedUserId("");
  };
  const valid = clientId && financialYear.trim() && dueDate;

  const submit = async () => {
    try {
      await createFiling.mutateAsync({
        clientId,
        financialYear: financialYear.trim(),
        formType,
        dueDate,
        assignedUserId: assignedUserId || undefined,
      });
      toast.success("ROC filing added.");
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't add this filing.");
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
          <Plus className="h-4 w-4" /> New filing
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a ROC/MCA filing</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="roc-client">Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="roc-client">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients?.items.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.displayName}
                    {c.cinOrLlpin ? ` — ${c.cinOrLlpin}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="roc-form-type">Form type</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as RocFormType)}>
                <SelectTrigger id="roc-form-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROC_FORM_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="roc-fy">Financial year</Label>
              <Input id="roc-fy" placeholder="2025-26" value={financialYear} onChange={(e) => setFinancialYear(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="roc-due">Due date</Label>
            <Input id="roc-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="roc-assignee">Assign to (optional)</Label>
            <Select value={assignedUserId} onValueChange={setAssignedUserId}>
              <SelectTrigger id="roc-assignee">
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!valid || createFiling.isPending} onClick={submit}>
            {createFiling.isPending ? "Saving…" : "Add filing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
