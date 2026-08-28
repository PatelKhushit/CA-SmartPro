"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Calendar, CheckCircle2, Circle, Clock, User } from "lucide-react";
import { useTask, useCompleteTask, useToggleChecklistItem, useAddTaskComment, useRescheduleTask } from "@/hooks/use-tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PRIORITY_MAP, effectiveTaskStatus } from "@/lib/status";
import { TASK_CATEGORY_LABELS } from "@/lib/types/task";
import { ApiClientError } from "@/lib/api-client";

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: task, isLoading, isError, refetch } = useTask(params.id);
  const completeTask = useCompleteTask();
  const toggleChecklist = useToggleChecklistItem(params.id);
  const addComment = useAddTaskComment(params.id);
  const reschedule = useRescheduleTask(params.id);
  const [commentText, setCommentText] = React.useState("");
  const [rescheduleDate, setRescheduleDate] = React.useState("");

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !task) {
    return (
      <ErrorState
        title="We couldn't load this task."
        description="It may have been removed, or you may not have access. Please check your connection and try again."
        onRetry={() => refetch()}
      />
    );
  }

  const statusInfo = effectiveTaskStatus(task.dueDate, task.status);
  const priorityInfo = PRIORITY_MAP[task.priority];
  const doneCount = task.checklistItems.filter((c) => c.isDone).length;
  const isDone = task.status === "COMPLETED" || task.status === "CANCELLED";

  const handleComplete = async () => {
    try {
      await completeTask.mutateAsync(task.id);
      toast.success("Task completed. Nice work.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't complete this task. Please try again.");
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDate) return;
    try {
      await reschedule.mutateAsync({ dueDate: rescheduleDate });
      toast.success("Task rescheduled.");
      setRescheduleDate("");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't reschedule this task.");
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      await addComment.mutateAsync(commentText.trim());
      setCommentText("");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't add your note.");
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/tasks")} className="mb-2 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Work
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-foreground">{task.title}</h1>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          <Badge variant={priorityInfo.variant}>{priorityInfo.label}</Badge>
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted">
          {task.client && (
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> {task.client.displayName}
            </span>
          )}
          {task.dueDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Due {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
          {task.estimatedMinutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {task.estimatedMinutes} min
            </span>
          )}
          <span>{TASK_CATEGORY_LABELS[task.category]}</span>
        </div>
      </div>

      {task.description && (
        <Card>
          <CardContent className="pt-6 text-sm text-foreground">{task.description}</CardContent>
        </Card>
      )}

      {task.checklistItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Checklist ({doneCount}/{task.checklistItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {task.checklistItems.map((item) => (
              <label key={item.id} className="flex items-center gap-3 rounded-md p-2 hover:bg-muted-surface">
                <Checkbox
                  checked={item.isDone}
                  disabled={isDone}
                  onCheckedChange={() => toggleChecklist.mutate(item.id)}
                />
                <span className={item.isDone ? "text-sm text-muted line-through" : "text-sm text-foreground"}>
                  {item.title}
                </span>
              </label>
            ))}
          </CardContent>
        </Card>
      )}

      {!isDone && (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleComplete} disabled={completeTask.isPending}>
            <CheckCircle2 className="h-4 w-4" /> {completeTask.isPending ? "Completing…" : "Complete task"}
          </Button>
          <div className="flex items-center gap-2">
            <Input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} className="w-40" />
            <Button variant="outline" onClick={handleReschedule} disabled={!rescheduleDate || reschedule.isPending}>
              Reschedule
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {task.comments.length === 0 ? (
            <p className="text-sm text-muted">No notes yet.</p>
          ) : (
            task.comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2 text-sm">
                <Circle className="mt-1 h-2 w-2 shrink-0 fill-muted text-muted" />
                <div>
                  <p className="text-foreground">{comment.body}</p>
                  <p className="text-xs text-muted">
                    {comment.user.fullName} · {new Date(comment.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
          <div className="mt-2 flex gap-2">
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a note…"
              onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
            />
            <Button variant="outline" onClick={handleAddComment} disabled={!commentText.trim() || addComment.isPending}>
              Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
