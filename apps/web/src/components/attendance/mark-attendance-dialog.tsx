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
import { useMarkAttendance } from "@/hooks/use-attendance";
import { useTeamMembers } from "@/hooks/use-team";
import { ATTENDANCE_STATUS_LABELS, type AttendanceStatus } from "@/lib/types/attendance";
import { useAuth } from "@/lib/auth-context";
import { ApiClientError } from "@/lib/api-client";

export function MarkAttendanceDialog() {
  const [open, setOpen] = React.useState(false);
  const [userId, setUserId] = React.useState("");
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = React.useState<AttendanceStatus>("ON_LEAVE");
  const [notes, setNotes] = React.useState("");

  const { hasPermission } = useAuth();
  const { data: members } = useTeamMembers({ enabled: open && hasPermission("team.manage") });
  const markAttendance = useMarkAttendance();

  const reset = () => {
    setUserId("");
    setDate(new Date().toISOString().slice(0, 10));
    setStatus("ON_LEAVE");
    setNotes("");
  };
  const valid = userId && date;

  const submit = async () => {
    try {
      await markAttendance.mutateAsync({ userId, date, status, notes: notes.trim() || undefined });
      toast.success("Attendance marked.");
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't mark attendance.");
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
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4" /> Mark attendance
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark attendance</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mark-member">Team member</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger id="mark-member">
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {members?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mark-date">Date</Label>
              <Input id="mark-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mark-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as AttendanceStatus)}>
                <SelectTrigger id="mark-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ATTENDANCE_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mark-notes">Notes (optional)</Label>
            <Textarea id="mark-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!valid || markAttendance.isPending} onClick={submit}>
            {markAttendance.isPending ? "Saving…" : "Mark attendance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
