"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateLeaveRequest } from "@/hooks/use-leave";
import { LEAVE_TYPE_LABELS, type LeaveType } from "@/lib/types/leave";
import { ApiClientError } from "@/lib/api-client";

function daysBetween(start: string, end: string): number {
  if (!start || !end) return 1;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

export function NewLeaveRequestDialog() {
  const [open, setOpen] = React.useState(false);
  const [leaveType, setLeaveType] = React.useState<LeaveType>("CASUAL");
  const [startDate, setStartDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [days, setDays] = React.useState("1");
  const [reason, setReason] = React.useState("");
  const [daysTouched, setDaysTouched] = React.useState(false);

  const createRequest = useCreateLeaveRequest();

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (!daysTouched) setDays(String(daysBetween(value, endDate)));
  };
  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    if (!daysTouched) setDays(String(daysBetween(startDate, value)));
  };

  const reset = () => {
    setLeaveType("CASUAL");
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate(new Date().toISOString().slice(0, 10));
    setDays("1");
    setReason("");
    setDaysTouched(false);
  };
  const valid = startDate && endDate && Number(days) > 0 && new Date(endDate) >= new Date(startDate);

  const submit = async () => {
    try {
      await createRequest.mutateAsync({ leaveType, startDate, endDate, days: Number(days), reason: reason.trim() || undefined });
      toast.success("Leave request submitted.");
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't submit this leave request.");
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
          <Plus className="h-4 w-4" /> Request leave
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request leave</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="leave-type">Leave type</Label>
            <Select value={leaveType} onValueChange={(v) => setLeaveType(v as LeaveType)}>
              <SelectTrigger id="leave-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="leave-start">Start date</Label>
              <Input id="leave-start" type="date" value={startDate} onChange={(e) => handleStartDateChange(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="leave-end">End date</Label>
              <Input id="leave-end" type="date" value={endDate} onChange={(e) => handleEndDateChange(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="leave-days">Days (use 0.5 for a half day)</Label>
            <Input
              id="leave-days"
              type="number"
              min="0.5"
              step="0.5"
              value={days}
              onChange={(e) => {
                setDaysTouched(true);
                setDays(e.target.value);
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="leave-reason">Reason (optional)</Label>
            <Textarea id="leave-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!valid || createRequest.isPending} onClick={submit}>
            {createRequest.isPending ? "Submitting…" : "Submit request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
