"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTdsChallan, useTdsProfiles } from "@/hooks/use-tds";
import { ApiClientError } from "@/lib/api-client";

export function NewTdsChallanDialog() {
  const [open, setOpen] = React.useState(false);
  const [tdsProfileId, setTdsProfileId] = React.useState("");
  const [challanNumber, setChallanNumber] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [paymentDate, setPaymentDate] = React.useState("");
  const [section, setSection] = React.useState("");

  const { data: profiles } = useTdsProfiles();
  const createChallan = useCreateTdsChallan();

  const reset = () => { setTdsProfileId(""); setChallanNumber(""); setAmount(""); setPaymentDate(""); setSection(""); };
  const amountNum = Number(amount);
  const valid = tdsProfileId && challanNumber.trim() && amount && amountNum > 0;

  const submit = async () => {
    try {
      await createChallan.mutateAsync({ tdsProfileId, challanNumber: challanNumber.trim(), amount: amountNum, paymentDate: paymentDate || undefined, section: section.trim() || undefined });
      toast.success("Challan recorded.");
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't record this challan.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4" /> Add challan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a TDS challan</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="chal-profile">TAN</Label>
            <Select value={tdsProfileId} onValueChange={setTdsProfileId}>
              <SelectTrigger id="chal-profile"><SelectValue placeholder="Select TAN" /></SelectTrigger>
              <SelectContent>
                {profiles?.map((p) => <SelectItem key={p.id} value={p.id}>{p.client.displayName} — {p.tan}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="chal-number">Challan number</Label>
              <Input id="chal-number" value={challanNumber} onChange={(e) => setChallanNumber(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="chal-amount">Amount (₹)</Label>
              <Input id="chal-amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="chal-date">Payment date (optional)</Label>
              <Input id="chal-date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="chal-section">Section (optional)</Label>
              <Input id="chal-section" placeholder="194C, 194J…" value={section} onChange={(e) => setSection(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!valid || createChallan.isPending} onClick={submit}>
            {createChallan.isPending ? "Saving…" : "Add challan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
