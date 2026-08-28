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
import { useCreateTask } from "@/hooks/use-tasks";
import { useClients } from "@/hooks/use-clients";
import { ApiClientError } from "@/lib/api-client";

export function NewTaskDialog() {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [priority, setPriority] = React.useState("MEDIUM");
  const [dueDate, setDueDate] = React.useState("");
  const [clientId, setClientId] = React.useState<string>("");
  const createTask = useCreateTask();
  const { data: clients } = useClients({ pageSize: 100 });

  const reset = () => {
    setTitle("");
    setPriority("MEDIUM");
    setDueDate("");
    setClientId("");
  };

  const submit = async () => {
    try {
      await createTask.mutateAsync({
        title,
        priority,
        dueDate: dueDate || undefined,
        clientId: clientId || undefined,
      });
      toast.success("Task created.");
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't save this task. Please check your connection and try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> New task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a task</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="GST review — ABC Traders" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="task-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-due">Due date</Label>
              <Input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-client">Client (optional)</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="task-client">
                <SelectValue placeholder="Internal task (no client)" />
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!title || createTask.isPending} onClick={submit}>
            {createTask.isPending ? "Saving…" : "Create task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
