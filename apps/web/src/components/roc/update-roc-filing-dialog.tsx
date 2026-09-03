"use client";

import * as React from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useUpdateRocFiling } from "@/hooks/use-roc";
import { ApiClientError } from "@/lib/api-client";
import type { RocFiling } from "@/lib/types/roc";

export function UpdateRocFilingDialog({ filing }: { filing: RocFiling }) {
  const [open, setOpen] = React.useState(false);
  const [srn, setSrn] = React.useState(filing.srn ?? "");
  const [filingDate, setFilingDate] = React.useState(filing.filingDate ? filing.filingDate.slice(0, 10) : "");
  const updateFiling = useUpdateRocFiling();

  const submit = async () => {
    try {
      await updateFiling.mutateAsync({
        id: filing.id,
        srn: srn.trim() || undefined,
        filingDate: filingDate || undefined,
      });
      toast.success("Filing details updated.");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't update this filing.");
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
          <DialogTitle>Filing details — {filing.client.displayName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="roc-srn">SRN</Label>
            <Input id="roc-srn" value={srn} onChange={(e) => setSrn(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="roc-filing-date">Filing date</Label>
            <Input id="roc-filing-date" type="date" value={filingDate} onChange={(e) => setFilingDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={updateFiling.isPending} onClick={submit}>
            {updateFiling.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
