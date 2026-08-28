"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateCalendarEvent } from "@/hooks/use-calendar";
import { ApiClientError } from "@/lib/api-client";

export function NewEventDialog({ defaultDate }: { defaultDate?: Date }) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState("CLIENT_MEETING");
  const [date, setDate] = React.useState(() => (defaultDate ?? new Date()).toISOString().slice(0, 10));
  const [time, setTime] = React.useState("10:00");
  const createEvent = useCreateCalendarEvent();

  const submit = async () => {
    try {
      const startAt = new Date(`${date}T${time}:00`);
      const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
      await createEvent.mutateAsync({ title, type, startAt: startAt.toISOString(), endAt: endAt.toISOString() });
      toast.success("Event added.");
      setOpen(false);
      setTitle("");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't save this event.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> New event
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a calendar event</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-title">Title</Label>
            <Input id="event-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Client review call" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-type">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="event-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLIENT_MEETING">Client meeting</SelectItem>
                  <SelectItem value="INTERNAL_MEETING">Internal meeting</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-date">Date</Label>
              <Input id="event-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-time">Time</Label>
            <Input id="event-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!title || createEvent.isPending} onClick={submit}>
            {createEvent.isPending ? "Saving…" : "Add event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
