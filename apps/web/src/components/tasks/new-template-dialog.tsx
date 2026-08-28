"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTaskTemplate } from "@/hooks/use-tasks";
import { TASK_FREQUENCY_LABELS, type TaskFrequency } from "@/lib/types/task";
import { SERVICE_CATEGORY_LABELS } from "@/lib/types/client";
import { ApiClientError } from "@/lib/api-client";

export function NewTemplateDialog() {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [frequency, setFrequency] = React.useState<TaskFrequency>("MONTHLY");
  const [scope, setScope] = React.useState("PER_CLIENT");
  const [applicableServiceType, setApplicableServiceType] = React.useState<string>("");
  const [dueDayOfPeriod, setDueDayOfPeriod] = React.useState("20");
  const [leadDays, setLeadDays] = React.useState("10");
  const [checklistText, setChecklistText] = React.useState("");
  const createTemplate = useCreateTaskTemplate();

  const submit = async () => {
    try {
      await createTemplate.mutateAsync({
        name,
        frequency,
        scope,
        applicableServiceType: applicableServiceType || undefined,
        dueDayOfPeriod: dueDayOfPeriod ? Number(dueDayOfPeriod) : undefined,
        leadDays: leadDays ? Number(leadDays) : undefined,
        checklistItems: checklistText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      toast.success("Template created. It will generate tasks automatically going forward.");
      setOpen(false);
      setName("");
      setChecklistText("");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't save this template.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4" /> New template
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a recurring task template</DialogTitle>
          <DialogDescription>
            Tasks generate automatically for each applicable client, once per period. Never duplicated.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tpl-name">Name</Label>
            <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Monthly GST Workflow" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-frequency">Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as TaskFrequency)}>
                <SelectTrigger id="tpl-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_FREQUENCY_LABELS)
                    .filter(([value]) => value !== "ONE_TIME")
                    .map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-scope">Applies to</Label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger id="tpl-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PER_CLIENT">Each applicable client</SelectItem>
                  <SelectItem value="FIRM_WIDE">Firm-wide (internal)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {scope === "PER_CLIENT" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-service">Only clients with this service (optional)</Label>
              <Select value={applicableServiceType} onValueChange={setApplicableServiceType}>
                <SelectTrigger id="tpl-service">
                  <SelectValue placeholder="All active clients" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SERVICE_CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-due-day">Due day of period</Label>
              <Input id="tpl-due-day" type="number" min={1} max={31} value={dueDayOfPeriod} onChange={(e) => setDueDayOfPeriod(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-lead-days">Generate this many days before due</Label>
              <Input id="tpl-lead-days" type="number" min={0} max={60} value={leadDays} onChange={(e) => setLeadDays(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tpl-checklist">Checklist (one step per line)</Label>
            <textarea
              id="tpl-checklist"
              value={checklistText}
              onChange={(e) => setChecklistText(e.target.value)}
              rows={5}
              placeholder={"Collect data\nVerify data\nReconcile\nPrepare\nReview\nFile\nConfirm"}
              className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!name || createTemplate.isPending} onClick={submit}>
            {createTemplate.isPending ? "Saving…" : "Create template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
