"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateAutomationRule } from "@/hooks/use-automations";
import { ACTION_TYPE_LABELS, TRIGGER_TYPE_LABELS } from "@/lib/types/automation";
import type { AutomationAction, AutomationActionType, AutomationTriggerType, ClientActiveCondition } from "@/lib/types/automation";
import { ApiClientError } from "@/lib/api-client";

function blankAction(type: AutomationActionType): AutomationAction {
  if (type === "CREATE_NOTIFICATION") return { type, title: "", body: "" };
  if (type === "CREATE_TASK") return { type, title: "" };
  if (type === "SEND_EMAIL") return { type, subject: "" };
  return { type, template: "" };
}

export function NewAutomationDialog() {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [triggerType, setTriggerType] = React.useState<AutomationTriggerType>("TASK_OVERDUE");
  const [daysBefore, setDaysBefore] = React.useState("3");
  const [useCondition, setUseCondition] = React.useState(false);
  const [conditionValue, setConditionValue] = React.useState<ClientActiveCondition["value"]>("ACTIVE");
  const [actions, setActions] = React.useState<AutomationAction[]>([blankAction("CREATE_NOTIFICATION")]);

  const createRule = useCreateAutomationRule();

  const reset = () => {
    setName(""); setDescription(""); setTriggerType("TASK_OVERDUE"); setDaysBefore("3");
    setUseCondition(false); setConditionValue("ACTIVE"); setActions([blankAction("CREATE_NOTIFICATION")]);
  };

  const updateAction = (i: number, patch: Partial<AutomationAction>) => {
    setActions((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  };

  const changeActionType = (i: number, type: AutomationActionType) => {
    setActions((prev) => prev.map((a, idx) => (idx === i ? blankAction(type) : a)));
  };

  const actionsValid = actions.every((a) => {
    if (a.type === "CREATE_NOTIFICATION") return a.title?.trim() && a.body?.trim();
    if (a.type === "CREATE_TASK") return a.title?.trim();
    if (a.type === "SEND_EMAIL") return a.subject?.trim();
    return a.template?.trim();
  });
  const valid = name.trim() && actions.length > 0 && actionsValid;

  const submit = async () => {
    try {
      await createRule.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        triggerType,
        triggerConfig: triggerType === "COMPLIANCE_DUE_SOON" ? { daysBefore: Number(daysBefore) || 3 } : undefined,
        conditions: useCondition ? [{ field: "client.status", op: "eq", value: conditionValue }] : undefined,
        actions,
      });
      toast.success("Automation created.");
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't create this automation.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> New automation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Build an automation</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="auto-name">Name</Label>
            <Input id="auto-name" placeholder="Escalate overdue tasks" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="auto-desc">Description (optional)</Label>
            <Input id="auto-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">When</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="auto-trigger">Trigger</Label>
                <Select value={triggerType} onValueChange={(v) => setTriggerType(v as AutomationTriggerType)}>
                  <SelectTrigger id="auto-trigger"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRIGGER_TYPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {triggerType === "COMPLIANCE_DUE_SOON" && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="auto-days">Days before due</Label>
                  <Input id="auto-days" type="number" min="1" max="30" value={daysBefore} onChange={(e) => setDaysBefore(e.target.value)} />
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border p-3">
            <div className="mb-2 flex items-center gap-2">
              <Checkbox id="auto-cond" checked={useCondition} onCheckedChange={(v) => setUseCondition(v === true)} />
              <Label htmlFor="auto-cond" className="text-xs font-semibold uppercase tracking-wide text-muted">If (optional condition)</Label>
            </div>
            {useCondition && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted">Client status equals</span>
                <Select value={conditionValue} onValueChange={(v) => setConditionValue(v as ClientActiveCondition["value"])}>
                  <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Then</p>
            <div className="flex flex-col gap-3">
              {actions.map((action, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-lg bg-muted-surface p-2">
                  <div className="flex items-center gap-2">
                    <Select value={action.type} onValueChange={(v) => changeActionType(i, v as AutomationActionType)}>
                      <SelectTrigger className="h-8 flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ACTION_TYPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {actions.length > 1 && (
                      <Button size="icon" variant="ghost" aria-label="Remove action" onClick={() => setActions((prev) => prev.filter((_, idx) => idx !== i))}>
                        <Trash2 className="h-4 w-4 text-muted" />
                      </Button>
                    )}
                  </div>
                  {action.type === "CREATE_NOTIFICATION" && (
                    <>
                      <Input placeholder="Notification title" value={action.title ?? ""} onChange={(e) => updateAction(i, { title: e.target.value })} />
                      <Input placeholder="Notification body" value={action.body ?? ""} onChange={(e) => updateAction(i, { body: e.target.value })} />
                    </>
                  )}
                  {action.type === "CREATE_TASK" && (
                    <Input placeholder="Task title" value={action.title ?? ""} onChange={(e) => updateAction(i, { title: e.target.value })} />
                  )}
                  {action.type === "SEND_EMAIL" && (
                    <>
                      <Input placeholder="Subject" value={action.subject ?? ""} onChange={(e) => updateAction(i, { subject: e.target.value })} />
                      <p className="text-xs text-status-attention">Email delivery isn&apos;t configured yet — this action will be recorded as skipped.</p>
                    </>
                  )}
                  {action.type === "SEND_WHATSAPP" && (
                    <>
                      <Input placeholder="Template name" value={action.template ?? ""} onChange={(e) => updateAction(i, { template: e.target.value })} />
                      <p className="text-xs text-status-attention">WhatsApp delivery isn&apos;t configured yet — this action will be recorded as skipped.</p>
                    </>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setActions((prev) => [...prev, blankAction("CREATE_NOTIFICATION")])}>
                <Plus className="h-3.5 w-3.5" /> Add action
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!valid || createRule.isPending} onClick={submit}>
            {createRule.isPending ? "Creating…" : "Create automation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
