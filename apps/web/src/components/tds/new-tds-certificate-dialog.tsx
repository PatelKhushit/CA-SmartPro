"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTdsCertificate, useTdsProfiles } from "@/hooks/use-tds";
import { TDS_CERT_TYPE_LABELS } from "@/lib/types/tds";
import type { TdsCertificateType } from "@/lib/types/tds";
import { ApiClientError } from "@/lib/api-client";

export function NewTdsCertificateDialog() {
  const [open, setOpen] = React.useState(false);
  const [tdsProfileId, setTdsProfileId] = React.useState("");
  const [certificateType, setCertificateType] = React.useState<TdsCertificateType>("FORM_16A");
  const [quarter, setQuarter] = React.useState("");

  const { data: profiles } = useTdsProfiles();
  const createCertificate = useCreateTdsCertificate();

  const reset = () => { setTdsProfileId(""); setCertificateType("FORM_16A"); setQuarter(""); };
  const valid = tdsProfileId && quarter.trim();

  const submit = async () => {
    try {
      await createCertificate.mutateAsync({ tdsProfileId, certificateType, quarter: quarter.trim() });
      toast.success("Certificate tracked.");
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't add this certificate.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4" /> Add certificate
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Track a TDS certificate</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cert-profile">TAN</Label>
            <Select value={tdsProfileId} onValueChange={setTdsProfileId}>
              <SelectTrigger id="cert-profile"><SelectValue placeholder="Select TAN" /></SelectTrigger>
              <SelectContent>
                {profiles?.map((p) => <SelectItem key={p.id} value={p.id}>{p.client.displayName} — {p.tan}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cert-type">Certificate type</Label>
              <Select value={certificateType} onValueChange={(v) => setCertificateType(v as TdsCertificateType)}>
                <SelectTrigger id="cert-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TDS_CERT_TYPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cert-quarter">Quarter</Label>
              <Input id="cert-quarter" placeholder="Q2 FY2026-27" value={quarter} onChange={(e) => setQuarter(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!valid || createCertificate.isPending} onClick={submit}>
            {createCertificate.isPending ? "Saving…" : "Add certificate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
