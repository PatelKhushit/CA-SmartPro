"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTdsProfile } from "@/hooks/use-tds";
import { useClients } from "@/hooks/use-clients";
import { ApiClientError } from "@/lib/api-client";

const TAN_SHAPE = /^[A-Z]{4}[0-9]{5}[A-Z]$/;

export function NewTdsProfileDialog() {
  const [open, setOpen] = React.useState(false);
  const [clientId, setClientId] = React.useState("");
  const [tan, setTan] = React.useState("");
  const [deductorType, setDeductorType] = React.useState("");

  const { data: clients } = useClients({ pageSize: 100 });
  const createProfile = useCreateTdsProfile();

  const reset = () => { setClientId(""); setTan(""); setDeductorType(""); };
  const tanValid = TAN_SHAPE.test(tan.toUpperCase());
  const valid = clientId && tanValid;

  const submit = async () => {
    try {
      await createProfile.mutateAsync({ clientId, tan: tan.toUpperCase(), deductorType: deductorType.trim() || undefined });
      toast.success("TAN added.");
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't add this TAN.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4" /> Add TAN
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a TDS deductor (TAN)</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tds-client">Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="tds-client"><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients?.items.map((c) => <SelectItem key={c.id} value={c.id}>{c.displayName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tds-tan">TAN</Label>
            <Input id="tds-tan" placeholder="ABCD12345E" value={tan} onChange={(e) => setTan(e.target.value.toUpperCase())} maxLength={10} />
            {tan.length > 0 && !tanValid && <p className="text-xs text-status-overdue">That doesn&apos;t look like a valid 10-character TAN.</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tds-deductor">Deductor type (optional)</Label>
            <Input id="tds-deductor" placeholder="Company, Individual, Firm…" value={deductorType} onChange={(e) => setDeductorType(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!valid || createProfile.isPending} onClick={submit}>
            {createProfile.isPending ? "Saving…" : "Add TAN"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
