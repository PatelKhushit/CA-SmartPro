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
import { useCreateComplianceRule } from "@/hooks/use-compliance";
import { SERVICE_CATEGORY_LABELS } from "@/lib/types/client";
import { TASK_FREQUENCY_LABELS } from "@/lib/types/task";
import { ApiClientError } from "@/lib/api-client";

export function NewComplianceRuleDialog() {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("GST");
  const [frequency, setFrequency] = React.useState("MONTHLY");
  const [dueDayOfPeriod, setDueDayOfPeriod] = React.useState("20");
  const [effectiveFrom, setEffectiveFrom] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [source, setSource] = React.useState("");
  const [sourceUrl, setSourceUrl] = React.useState("");
  const createRule = useCreateComplianceRule();

  const submit = async () => {
    try {
      await createRule.mutateAsync({
        name,
        category,
        frequency,
        dueDayOfPeriod: Number(dueDayOfPeriod),
        effectiveFrom: new Date(effectiveFrom).toISOString(),
        source,
        sourceUrl: sourceUrl || undefined,
      });
      toast.success("Rule created as a draft. Verify it against the source before activating.");
      setOpen(false);
      setName("");
      setSource("");
      setSourceUrl("");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't save this rule.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> New rule
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a compliance rule</DialogTitle>
          <DialogDescription>
            Statutory deadlines are never invented by this system — enter the rule yourself and cite the source.
            It starts as a draft and won&apos;t generate anything until you verify it.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rule-name">Name</Label>
            <Input id="rule-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="GSTR-3B Monthly Return" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rule-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="rule-category">
                  <SelectValue />
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rule-frequency">Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger id="rule-frequency">
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
              <Label htmlFor="rule-due-day">Due day</Label>
              <Input id="rule-due-day" type="number" min={1} max={31} value={dueDayOfPeriod} onChange={(e) => setDueDayOfPeriod(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rule-effective">Effective from</Label>
            <Input id="rule-effective" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rule-source">Source (required)</Label>
            <Input id="rule-source" value={source} onChange={(e) => setSource(e.target.value)} placeholder="CBIC GST notification, CA Institute circular, etc." />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rule-source-url">Source URL (optional)</Label>
            <Input id="rule-source-url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!name || !source || createRule.isPending} onClick={submit}>
            {createRule.isPending ? "Saving…" : "Create draft rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
