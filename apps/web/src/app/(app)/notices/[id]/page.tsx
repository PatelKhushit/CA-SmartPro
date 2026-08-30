"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotice, useUpdateNotice, useAddNoticeComment, useCreateNoticeTask } from "@/hooks/use-notices";
import { NOTICE_STATUS_LABELS, NOTICE_STATUS_VARIANT, type NoticeStatus } from "@/lib/types/notice";
import { SERVICE_CATEGORY_LABELS } from "@/lib/types/client";
import { useAuth } from "@/lib/auth-context";
import { ApiClientError } from "@/lib/api-client";

const STATUS_OPTIONS: NoticeStatus[] = [
  "NEW", "UNDER_REVIEW", "DRAFTING", "WAITING_FOR_CLIENT", "READY_TO_SUBMIT", "SUBMITTED", "CLOSED",
];

export default function NoticeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { data: notice, isLoading, isError, refetch } = useNotice(params.id);
  const updateNotice = useUpdateNotice(params.id);
  const addComment = useAddNoticeComment(params.id);
  const createTask = useCreateNoticeTask(params.id);
  const [comment, setComment] = React.useState("");
  const [taskTitle, setTaskTitle] = React.useState("");

  const canManage = hasPermission("notices.manage");

  const changeStatus = async (status: NoticeStatus) => {
    try {
      await updateNotice.mutateAsync({ status });
      toast.success("Status updated.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't update status.");
    }
  };

  const submitComment = async () => {
    if (!comment.trim()) return;
    try {
      await addComment.mutateAsync(comment.trim());
      setComment("");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't add comment.");
    }
  };

  const submitTask = async () => {
    if (!taskTitle.trim()) return;
    try {
      await createTask.mutateAsync({ title: taskTitle.trim() });
      setTaskTitle("");
      toast.success("Task created and linked.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't create task.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !notice) {
    return <ErrorState description="We couldn't load this notice." onRetry={() => refetch()} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/notices")} aria-label="Back to notices">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-foreground">{notice.noticeType}</h1>
          <p className="text-sm text-muted">
            <Link href={`/clients/${notice.clientId}`} className="text-brand-700 hover:underline">{notice.client.displayName}</Link>
            {" · "}Ref {notice.referenceNumber}
          </p>
        </div>
        {canManage ? (
          <Select value={notice.status} onValueChange={(v) => changeStatus(v as NoticeStatus)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{NOTICE_STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant={NOTICE_STATUS_VARIANT[notice.status]}>{NOTICE_STATUS_LABELS[notice.status]}</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Row label="Department" value={SERVICE_CATEGORY_LABELS[notice.department]} />
            <Row label="Notice date" value={new Date(notice.noticeDate).toLocaleDateString()} />
            <Row label="Response deadline" value={notice.responseDeadline ? new Date(notice.responseDeadline).toLocaleDateString() : "—"} />
            <Row label="Priority" value={notice.priority} />
            <Row label="Assigned to" value={notice.assignedUser?.fullName ?? "Unassigned"} />
            <Row label="Logged by" value={notice.createdBy.fullName} />
            {notice.description && (
              <div className="mt-2 border-t border-border pt-2">
                <p className="text-xs uppercase tracking-wide text-muted">Description</p>
                <p className="mt-1 text-foreground">{notice.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Linked tasks</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {notice.tasks.length === 0 && <p className="text-sm text-muted">No tasks linked yet.</p>}
            {notice.tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span className="text-foreground">{t.title}</span>
                <Badge variant="neutral">{t.status}</Badge>
              </div>
            ))}
            {canManage && (
              <div className="flex gap-2">
                <input
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="New task title…"
                  className="flex h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitTask(); } }}
                />
                <Button size="sm" variant="outline" onClick={submitTask} disabled={!taskTitle.trim() || createTask.isPending}>Add</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {notice.comments.length === 0 && <p className="text-sm text-muted">No comments yet.</p>}
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {notice.comments.map((c) => (
                <div key={c.id} className="rounded-lg bg-muted-surface px-3 py-2 text-sm">
                  <p className="text-foreground">{c.body}</p>
                  <p className="mt-1 text-xs text-muted">{c.user.fullName} · {new Date(c.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment…"
                className="flex h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitComment(); } }}
              />
              <Button size="icon" variant="outline" onClick={submitComment} disabled={!comment.trim() || addComment.isPending} aria-label="Send comment">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
