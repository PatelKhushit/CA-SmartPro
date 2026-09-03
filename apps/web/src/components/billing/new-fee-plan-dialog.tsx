"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateFeePlan } from "@/hooks/use-billing";
import { useClients } from "@/hooks/use-clients";
import { FEE_FREQUENCY_LABELS, type FeeFrequency } from "@/lib/types/billing";
import { ApiClientError } from "@/lib/api-client";

export function NewFeePlanDialog() {
  const [open, setOpen] = React.useState(false);
  const [clientId, setClientId] = React.useState("");
  const [name, setName] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [frequency, setFrequency] = React.useState<FeeFrequency>("ONE_TIME");
  const [startDate, setStartDate] = React.useState(() => new Date().toISOString().slice(0, 10));

  const { data: clients } = useClients({ pageSize: 100 });
  const createFeePlan = useCreateFeePlan();

  const reset = () => {
    setClientId("");
    setName("");
    setAmount("");
    setFrequency("ONE_TIME");
    setStartDate(new Date().toISOString().slice(0, 10));
  };
  const valid = clientId && name.trim() && amount && Number(amount) > 0 && startDate;

  const submit = async () => {
    try {
      await createFeePlan.mutateAsync({
        clientId,
        name: name.trim(),
        amount: Number(amount),
        frequency,
        startDate,
      });
      toast.success("Fee plan added.");
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't add this fee plan.");
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
          <Plus className="h-4 w-4" /> New fee plan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a fee plan</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fp-client">Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="fp-client">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients?.items.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fp-name">Plan name</Label>
            <Input id="fp-name" placeholder="e.g. Monthly retainer" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fp-amount">Amount (₹)</Label>
              <Input id="fp-amount" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fp-frequency">Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as FeeFrequency)}>
                <SelectTrigger id="fp-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FEE_FREQUENCY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fp-start">Start date</Label>
            <Input id="fp-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!valid || createFeePlan.isPending} onClick={submit}>
            {createFeePlan.isPending ? "Saving…" : "Add fee plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
