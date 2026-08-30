"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateGstProfile } from "@/hooks/use-gst";
import { useClients } from "@/hooks/use-clients";
import { ApiClientError } from "@/lib/api-client";

const GSTIN_SHAPE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function NewGstProfileDialog() {
  const [open, setOpen] = React.useState(false);
  const [clientId, setClientId] = React.useState("");
  const [gstin, setGstin] = React.useState("");
  const [tradeName, setTradeName] = React.useState("");
  const [state, setState] = React.useState("");

  const { data: clients } = useClients({ pageSize: 100 });
  const createProfile = useCreateGstProfile();

  const reset = () => { setClientId(""); setGstin(""); setTradeName(""); setState(""); };

  const gstinValid = GSTIN_SHAPE.test(gstin.toUpperCase());
  const valid = clientId && gstinValid;

  const submit = async () => {
    try {
      await createProfile.mutateAsync({ clientId, gstin: gstin.toUpperCase(), tradeName: tradeName.trim() || undefined, state: state.trim() || undefined });
      toast.success("GST profile added.");
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't add this GST profile.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4" /> Add GSTIN
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a GST registration</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gst-client">Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="gst-client"><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients?.items.map((c) => <SelectItem key={c.id} value={c.id}>{c.displayName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gst-gstin">GSTIN</Label>
            <Input id="gst-gstin" placeholder="22AAAAA0000A1Z5" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} maxLength={15} />
            {gstin.length > 0 && !gstinValid && <p className="text-xs text-status-overdue">That doesn&apos;t look like a valid 15-character GSTIN.</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gst-trade">Trade name (optional)</Label>
              <Input id="gst-trade" value={tradeName} onChange={(e) => setTradeName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gst-state">State (optional)</Label>
              <Input id="gst-state" value={state} onChange={(e) => setState(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!valid || createProfile.isPending} onClick={submit}>
            {createProfile.isPending ? "Saving…" : "Add GSTIN"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
