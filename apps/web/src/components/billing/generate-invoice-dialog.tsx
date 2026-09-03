"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useGenerateInvoiceFromFeePlan } from "@/hooks/use-billing";
import { ApiClientError } from "@/lib/api-client";
import type { FeePlan } from "@/lib/types/billing";

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function GenerateInvoiceDialog({ feePlan }: { feePlan: FeePlan }) {
  const [open, setOpen] = React.useState(false);
  const [issueDate, setIssueDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = React.useState(() => addDays(14));
  const router = useRouter();
  const generate = useGenerateInvoiceFromFeePlan();

  const submit = async () => {
    try {
      const invoice = await generate.mutateAsync({ id: feePlan.id, issueDate, dueDate });
      toast.success(`Invoice ${invoice.invoiceNumber} created.`);
      setOpen(false);
      router.push(`/invoices/${invoice.id}`);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't generate this invoice.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Generate invoice">
          <Receipt className="h-4 w-4 text-muted" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate invoice — {feePlan.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Creates a draft invoice for {feePlan.client.displayName} for ₹{feePlan.amount}.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gi-issue">Issue date</Label>
              <Input id="gi-issue" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gi-due">Due date</Label>
              <Input id="gi-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={generate.isPending} onClick={submit}>
            {generate.isPending ? "Generating…" : "Generate invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
