"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUpdateUdin } from "@/hooks/use-udin";
import type { UdinRecord } from "@/lib/types/udin";
import { ApiClientError } from "@/lib/api-client";

export function GenerateUdinDialog({ record, open, onOpenChange }: { record: UdinRecord; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [udinNumber, setUdinNumber] = React.useState(record.udinNumber ?? "");
  const updateUdin = useUpdateUdin();

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setUdinNumber(record.udinNumber ?? "");
  }, [open, record.udinNumber]);

  const submit = async () => {
    const value = udinNumber.trim().toUpperCase();
    if (!/^[A-Z0-9]{10,20}$/.test(value)) {
      toast.error("UDIN must be 10-20 alphanumeric characters (as issued by ICAI).");
      return;
    }
    try {
      await updateUdin.mutateAsync({ id: record.id, udinNumber: value });
      toast.success("UDIN recorded.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't save this UDIN.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record UDIN — {record.client.displayName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Enter the UDIN number as generated on the ICAI UDIN portal. This system does not generate UDINs itself —
            it only records what ICAI issued.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="udin-number">UDIN number</Label>
            <Input
              id="udin-number"
              placeholder="24XXXXXXXXXXXXXXXX"
              value={udinNumber}
              onChange={(e) => setUdinNumber(e.target.value.toUpperCase())}
              maxLength={20}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!udinNumber.trim() || updateUdin.isPending} onClick={submit}>
            {updateUdin.isPending ? "Saving…" : "Save UDIN"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
