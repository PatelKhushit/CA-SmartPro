"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateInvoice, type InvoiceLineItemInput } from "@/hooks/use-billing";
import { useClients } from "@/hooks/use-clients";
import { ApiClientError } from "@/lib/api-client";

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

interface DraftLineItem {
  description: string;
  quantity: string;
  unitPrice: string;
}

const EMPTY_ITEM: DraftLineItem = { description: "", quantity: "1", unitPrice: "" };

export function NewInvoiceDialog() {
  const [open, setOpen] = React.useState(false);
  const [clientId, setClientId] = React.useState("");
  const [issueDate, setIssueDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = React.useState(() => addDays(14));
  const [items, setItems] = React.useState<DraftLineItem[]>([{ ...EMPTY_ITEM }]);
  const [includeGst, setIncludeGst] = React.useState(false);

  const { data: clients } = useClients({ pageSize: 100 });
  const router = useRouter();
  const createInvoice = useCreateInvoice();

  const reset = () => {
    setClientId("");
    setIssueDate(new Date().toISOString().slice(0, 10));
    setDueDate(addDays(14));
    setItems([{ ...EMPTY_ITEM }]);
    setIncludeGst(false);
  };

  const updateItem = (index: number, patch: Partial<DraftLineItem>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };
  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const subtotal = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  const taxAmount = includeGst ? Math.round(subtotal * 0.18 * 100) / 100 : 0;
  const total = subtotal + taxAmount;

  const validItems = items.filter((it) => it.description.trim() && Number(it.unitPrice) > 0);
  const valid = clientId && issueDate && dueDate && validItems.length > 0;

  const submit = async () => {
    try {
      const lineItems: InvoiceLineItemInput[] = validItems.map((it) => ({
        description: it.description.trim(),
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice),
      }));
      const invoice = await createInvoice.mutateAsync({ clientId, issueDate, dueDate, lineItems, taxAmount });
      toast.success(`Invoice ${invoice.invoiceNumber} created.`);
      setOpen(false);
      reset();
      router.push(`/invoices/${invoice.id}`);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't create this invoice.");
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
          <Plus className="h-4 w-4" /> New invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create an invoice</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1 flex flex-col gap-1.5">
              <Label htmlFor="inv-client">Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger id="inv-client">
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
              <Label htmlFor="inv-issue">Issue date</Label>
              <Input id="inv-issue" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-due">Due date</Label>
              <Input id="inv-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Line items</Label>
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder="Description"
                  className="flex-1"
                  value={item.description}
                  onChange={(e) => updateItem(i, { description: e.target.value })}
                />
                <Input
                  type="number"
                  min="0"
                  placeholder="Qty"
                  className="w-20"
                  value={item.quantity}
                  onChange={(e) => updateItem(i, { quantity: e.target.value })}
                />
                <Input
                  type="number"
                  min="0"
                  placeholder="Unit price"
                  className="w-32"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(i, { unitPrice: e.target.value })}
                />
                <Button size="icon" variant="ghost" aria-label="Remove line" disabled={items.length === 1} onClick={() => removeItem(i)}>
                  <Trash2 className="h-4 w-4 text-muted" />
                </Button>
              </div>
            ))}
            <Button size="sm" variant="outline" className="self-start" onClick={addItem}>
              <Plus className="h-4 w-4" /> Add line
            </Button>
          </div>

          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={includeGst} onChange={(e) => setIncludeGst(e.target.checked)} className="h-4 w-4" />
            Add GST @ 18%
          </label>

          <div className="flex flex-col gap-1 self-end text-sm">
            <div className="flex justify-between gap-8">
              <span className="text-muted">Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {includeGst && (
              <div className="flex justify-between gap-8">
                <span className="text-muted">GST (18%)</span>
                <span>₹{taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between gap-8 font-semibold text-foreground">
              <span>Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!valid || createInvoice.isPending} onClick={submit}>
            {createInvoice.isPending ? "Creating…" : "Create invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
