"use client";

import * as React from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useUpdateItrReturn } from "@/hooks/use-itr";
import { ApiClientError } from "@/lib/api-client";
import type { ItrReturn } from "@/lib/types/itr";

export function UpdateItrReturnDialog({ itrReturn }: { itrReturn: ItrReturn }) {
  const [open, setOpen] = React.useState(false);
  const [ackNumber, setAckNumber] = React.useState(itrReturn.acknowledgementNumber ?? "");
  const [refundAmount, setRefundAmount] = React.useState(itrReturn.refundAmount ?? "");
  const [demandAmount, setDemandAmount] = React.useState(itrReturn.demandAmount ?? "");
  const updateReturn = useUpdateItrReturn();

  const submit = async () => {
    try {
      await updateReturn.mutateAsync({
        id: itrReturn.id,
        acknowledgementNumber: ackNumber.trim() || undefined,
        refundAmount: refundAmount !== "" ? Number(refundAmount) : undefined,
        demandAmount: demandAmount !== "" ? Number(demandAmount) : undefined,
      });
      toast.success("Return details updated.");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't update this return.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Edit details">
          <Pencil className="h-4 w-4 text-muted" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Return details — {itrReturn.client.displayName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="itr-ack">Acknowledgement number</Label>
            <Input id="itr-ack" value={ackNumber} onChange={(e) => setAckNumber(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="itr-refund">Refund amount (₹)</Label>
              <Input id="itr-refund" type="number" min="0" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="itr-demand">Demand amount (₹)</Label>
              <Input id="itr-demand" type="number" min="0" value={demandAmount} onChange={(e) => setDemandAmount(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={updateReturn.isPending} onClick={submit}>
            {updateReturn.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
