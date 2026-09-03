"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTask } from "@/hooks/use-tasks";
import { useClients } from "@/hooks/use-clients";
import { useTeamMembers } from "@/hooks/use-team";
import { useAuth } from "@/lib/auth-context";
import { createTaskSchema, type CreateTaskFormInput } from "@/lib/validation/task";
import { TASK_CATEGORY_LABELS } from "@/lib/types/task";
import { ApiClientError } from "@/lib/api-client";

interface NewTaskDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function NewTaskDialog({ open: controlledOpen, onOpenChange: setControlledOpen, hideTrigger }: NewTaskDialogProps = {}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;
  const [checklistItems, setChecklistItems] = React.useState<string[]>([]);
  const [checklistDraft, setChecklistDraft] = React.useState("");
  const { hasPermission } = useAuth();
  const createTask = useCreateTask();
  const { data: clients } = useClients({ pageSize: 100 });
  const { data: teamMembers } = useTeamMembers({ enabled: open && hasPermission("team.manage") });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskFormInput>({ resolver: zodResolver(createTaskSchema), mode: "onBlur", defaultValues: { priority: "MEDIUM" } });

  const closeAndReset = () => {
    setOpen(false);
    setChecklistItems([]);
    setChecklistDraft("");
    reset({ priority: "MEDIUM" });
  };

  const addChecklistItem = () => {
    const text = checklistDraft.trim();
    if (!text) return;
    setChecklistItems((prev) => [...prev, text]);
    setChecklistDraft("");
  };

  const onSubmit = async (values: CreateTaskFormInput) => {
    try {
      await createTask.mutateAsync({
        title: values.title,
        description: values.description || undefined,
        clientId: values.clientId || undefined,
        category: values.category || undefined,
        priority: values.priority || undefined,
        assignedUserId: values.assignedUserId || undefined,
        startDate: values.startDate || undefined,
        dueDate: values.dueDate || undefined,
        estimatedMinutes: values.estimatedHours ? Math.round(Number(values.estimatedHours) * 60) : undefined,
        checklistItems: checklistItems.length > 0 ? checklistItems : undefined,
      });
      toast.success("Task created.");
      closeAndReset();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't save this task. Please check your connection and try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeAndReset())}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4" /> New task
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" placeholder="GST review — ABC Traders" invalid={!!errors.title} {...register("title")} />
            {errors.title && <p className="text-xs text-status-overdue">{errors.title.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-description">Description</Label>
            <Textarea id="task-description" placeholder="What needs to be done" {...register("description")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-priority">Priority</Label>
              <Select value={watch("priority")} onValueChange={(v) => setValue("priority", v)}>
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
              <Label htmlFor="task-category">Category</Label>
              <Select value={watch("category")} onValueChange={(v) => setValue("category", v)}>
                <SelectTrigger id="task-category">
                  <SelectValue placeholder="Client-specific" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-start">Start date</Label>
              <Input id="task-start" type="date" {...register("startDate")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-due">Due date</Label>
              <Input id="task-due" type="date" invalid={!!errors.dueDate} {...register("dueDate")} />
              {errors.dueDate && <p className="text-xs text-status-overdue">{errors.dueDate.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-client">Client (optional)</Label>
              <Select value={watch("clientId")} onValueChange={(v) => setValue("clientId", v)}>
                <SelectTrigger id="task-client">
                  <SelectValue placeholder="Internal task" />
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-hours">Estimated hours</Label>
              <Input id="task-hours" type="number" min="0" max="16" step="0.5" invalid={!!errors.estimatedHours} {...register("estimatedHours")} />
              {errors.estimatedHours && <p className="text-xs text-status-overdue">{errors.estimatedHours.message}</p>}
            </div>
          </div>

          {hasPermission("team.manage") && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-assignee">Assignee</Label>
              <Select value={watch("assignedUserId")} onValueChange={(v) => setValue("assignedUserId", v)}>
                <SelectTrigger id="task-assignee">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers?.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-checklist">Checklist</Label>
            <div className="flex gap-2">
              <Input
                id="task-checklist"
                placeholder="Add a checklist item"
                value={checklistDraft}
                onChange={(e) => setChecklistDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addChecklistItem();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addChecklistItem}>
                Add
              </Button>
            </div>
            {checklistItems.length > 0 && (
              <ul className="mt-1 flex flex-col gap-1">
                {checklistItems.map((item, i) => (
                  <li key={i} className="flex items-center justify-between rounded-md bg-muted-surface px-2.5 py-1.5 text-sm">
                    <span className="text-foreground">{item}</span>
                    <button
                      type="button"
                      aria-label="Remove"
                      onClick={() => setChecklistItems((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-muted hover:text-status-overdue"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeAndReset}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
