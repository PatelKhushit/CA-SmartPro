"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Pause, Play, X } from "lucide-react";
import { useTask, useCompleteTask, useToggleChecklistItem, useRescheduleTask, useAddTaskComment, useRunningTimer, useStartTimer, useStopTimer } from "@/hooks/use-tasks";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { PRIORITY_MAP } from "@/lib/status";
import { ApiClientError } from "@/lib/api-client";

function formatElapsed(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function FocusModePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: task, isLoading, isError, refetch } = useTask(params.id);
  const completeTask = useCompleteTask();
  const toggleChecklist = useToggleChecklistItem(params.id);
  const rescheduleTask = useRescheduleTask(params.id);
  const addComment = useAddTaskComment(params.id);

  // Real, server-persisted timer — startedAt lives in the database, so unlike a
  // plain setInterval this survives a page refresh or a crashed tab instead of
  // silently losing the elapsed time.
  const { data: runningTimer } = useRunningTimer();
  const startTimer = useStartTimer(params.id);
  const stopTimer = useStopTimer(params.id);
  const hasRequestedStart = React.useRef(false);

  const [elapsed, setElapsed] = React.useState(0);
  const [note, setNote] = React.useState("");
  const [rescheduleDate, setRescheduleDate] = React.useState("");
  const [showReschedule, setShowReschedule] = React.useState(false);

  const isRunningHere = runningTimer?.taskId === params.id;

  // Entering focus mode starts (or resumes) this task's timer exactly once —
  // transparently switching away from whatever else was running, matching the
  // "I'm working on this now" intent of opening Focus Mode.
  React.useEffect(() => {
    if (hasRequestedStart.current || runningTimer === undefined) return;
    hasRequestedStart.current = true;
    if (runningTimer?.taskId !== params.id) startTimer.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runningTimer]);

  React.useEffect(() => {
    if (!isRunningHere || !runningTimer) return;
    const anchor = new Date(runningTimer.startedAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - anchor) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isRunningHere, runningTimer]);

  const togglePause = () => {
    if (isRunningHere) {
      stopTimer.mutate();
    } else {
      startTimer.mutate();
    }
  };

  const handleComplete = async () => {
    try {
      if (isRunningHere) await stopTimer.mutateAsync();
      await completeTask.mutateAsync(params.id);
      toast.success("Task completed. Nice work.");
      router.push("/my-day");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't complete this task.");
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDate) return;
    try {
      await rescheduleTask.mutateAsync({ dueDate: rescheduleDate });
      toast.success("Rescheduled.");
      router.push("/my-day");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't reschedule this task.");
    }
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;
    try {
      await addComment.mutateAsync(note.trim());
      setNote("");
      toast.success("Note added.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't save your note.");
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !task) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 items-center justify-center p-6">
        <ErrorState title="We couldn't load this task." description="Please check your connection and try again." onRetry={() => refetch()} />
      </div>
    );
  }

  const doneCount = task.checklistItems.filter((c) => c.isDone).length;
  const priorityInfo = PRIORITY_MAP[task.priority];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push("/my-day")}>
          <X className="h-4 w-4" /> Exit focus
        </Button>
        <Badge variant={priorityInfo.variant}>{priorityInfo.label}</Badge>
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">{task.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {task.client?.displayName ?? "Internal task"}
          {task.dueDate && ` · Due ${new Date(task.dueDate).toLocaleDateString()}`}
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface py-8">
        <p className="font-mono text-5xl font-semibold tabular-nums text-foreground">{formatElapsed(elapsed)}</p>
        <Button variant="outline" size="sm" onClick={togglePause} disabled={startTimer.isPending || stopTimer.isPending}>
          {isRunningHere ? (
            <>
              <Pause className="h-4 w-4" /> Pause
            </>
          ) : (
            <>
              <Play className="h-4 w-4" /> Resume
            </>
          )}
        </Button>
        {task.actualMinutes ? <p className="text-xs text-muted">{task.actualMinutes} min logged on this task in total</p> : null}
      </div>

      {task.description && <p className="text-sm text-foreground">{task.description}</p>}

      {task.checklistItems.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
          <p className="mb-1 text-sm font-medium text-foreground">
            Checklist ({doneCount}/{task.checklistItems.length})
          </p>
          {task.checklistItems.map((item) => (
            <label key={item.id} className="flex items-center gap-3 rounded-md p-1.5 hover:bg-muted-surface">
              <Checkbox checked={item.isDone} onCheckedChange={() => toggleChecklist.mutate(item.id)} />
              <span className={item.isDone ? "text-sm text-muted line-through" : "text-sm text-foreground"}>{item.title}</span>
            </label>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
        <p className="text-sm font-medium text-foreground">Add a note</p>
        <div className="flex gap-2">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Quick note about this task…" onKeyDown={(e) => e.key === "Enter" && handleAddNote()} />
          <Button variant="outline" onClick={handleAddNote} disabled={!note.trim()}>
            Add
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="lg" className="flex-1" onClick={handleComplete} disabled={completeTask.isPending}>
          <CheckCircle2 className="h-4 w-4" /> {completeTask.isPending ? "Completing…" : "Complete"}
        </Button>
        <Button size="lg" variant="outline" onClick={() => setShowReschedule((v) => !v)}>
          Reschedule
        </Button>
      </div>

      {showReschedule && (
        <div className="flex items-center gap-2">
          <Input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} className="w-40" />
          <Button variant="outline" onClick={handleReschedule} disabled={!rescheduleDate}>
            Confirm reschedule
          </Button>
        </div>
      )}
    </div>
  );
}
