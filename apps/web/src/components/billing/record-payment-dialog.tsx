"use client";

import * as React from "react";
import { toast } from "sonner";
import { IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreatePayment } from "@/hooks/use-billing";
import { PAYMENT_METHOD_LABELS, type Invoice, type PaymentMethod } from "@/lib/types/billing";
import { ApiClientError } from "@/lib/api-client";

export function RecordPaymentDialog({ invoice }: { invoice: Invoice }) {
  const remaining = Number(invoice.totalAmount) - Number(invoice.amountPaid);
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState(() => remaining.toFixed(2));
  const [paymentDate, setPaymentDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = React.useState<PaymentMethod>("BANK_TRANSFER");
  const [referenceNumber, setReferenceNumber] = React.useState("");

  const recordPayment = useCreatePayment();

  const valid = Number(amount) > 0 && Number(amount) <= remaining + 0.01 && paymentDate;

  const submit = async () => {
    try {
      await recordPayment.mutateAsync({
        invoiceId: invoice.id,
        amount: Number(amount),
        paymentDate,
        method,
        referenceNumber: referenceNumber.trim() || undefined,
      });
      toast.success("Payment recorded.");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't record this payment.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          setAmount(remaining.toFixed(2));
          setPaymentDate(new Date().toISOString().slice(0, 10));
          setMethod("BANK_TRANSFER");
          setReferenceNumber("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <IndianRupee className="h-4 w-4" /> Record payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a payment — {invoice.invoiceNumber}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">Outstanding balance: ₹{remaining.toFixed(2)}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pay-amount">Amount (₹)</Label>
              <Input id="pay-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pay-date">Payment date</Label>
              <Input id="pay-date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pay-method">Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger id="pay-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pay-ref">Reference number (optional)</Label>
            <Input id="pay-ref" placeholder="UTR / cheque no." value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!valid || recordPayment.isPending} onClick={submit}>
            {recordPayment.isPending ? "Saving…" : "Record payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
