"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock, Flame, Target } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useMyDay } from "@/hooks/use-tasks";
import { useGoals, useDeleteGoal } from "@/hooks/use-goals";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { NewGoalDialog, GOAL_TYPE_LABELS } from "@/components/my-day/new-goal-dialog";
import { PRIORITY_MAP, effectiveTaskStatus } from "@/lib/status";
import { X } from "lucide-react";

function todayKey() {
  const d = new Date();
  return `myday_started_${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export default function MyDayPage() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useMyDay();
  const [started, setStarted] = React.useState(false);

  React.useEffect(() => {
    // Reading sessionStorage must be deferred to a post-mount effect (not a
    // lazy useState initializer) because it doesn't exist during the
    // server-rendered pass — reading it during render would cause a
    // hydration mismatch between server and client output.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (sessionStorage.getItem(todayKey())) setStarted(true);
  }, []);

  const startMyDay = () => {
    sessionStorage.setItem(todayKey(), "1");
    setStarted(true);
  };

  const firstName = user?.fullName.split(" ")[0] ?? "";
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <ErrorState
        title="We couldn't load My Day."
        description="Please check your connection and try again."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-brand-200/60 bg-brand-50/10">
        <CardContent className="flex flex-col gap-4 pt-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {greeting()}, {firstName} 👋
            </h1>
            <p className="text-sm text-muted">{dateLabel}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Tasks today" value={data.counts.total} />
            <Stat label="High priority" value={data.counts.highPriority} accent="attention" />
            <Stat label="Follow-ups" value={data.counts.followUps} />
            <Stat label="Overdue" value={data.counts.overdue} accent="overdue" />
          </div>

          {!started && (
            <Button size="lg" onClick={startMyDay} className="mt-2 w-full sm:w-auto">
              Start My Day <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>

      {started && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-status-attention" /> Next best task
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.nextBestTask ? (
                  <NextBestTaskCard taskId={data.nextBestTask.id} title={data.nextBestTask.title} priority={data.nextBestTask.priority} client={data.nextBestTask.client?.displayName} dueDate={data.nextBestTask.dueDate} estimatedMinutes={data.nextBestTask.estimatedMinutes} />
                ) : (
                  <EmptyState icon={CheckCircle2} title="Nothing due today." description="Enjoy the clear runway, or line up tomorrow's work." />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Today&apos;s progress</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div>
                  <p className="text-3xl font-semibold text-foreground">{data.counts.productivityPercent}%</p>
                  <p className="text-xs text-muted">
                    {data.counts.completed} / {data.counts.total} completed
                  </p>
                </div>
                <Progress value={data.counts.productivityPercent} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Today&apos;s tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {data.tasks.length === 0 ? (
                <EmptyState title="No tasks queued for today." />
              ) : (
                <div className="flex flex-col divide-y divide-border">
                  {data.tasks.map((task) => {
                    const statusInfo = effectiveTaskStatus(task.dueDate, task.status);
                    const priorityInfo = PRIORITY_MAP[task.priority];
                    return (
                      <Link
                        key={task.id}
                        href={`/tasks/${task.id}`}
                        className="flex items-center justify-between gap-3 py-3 hover:bg-muted-surface/60 -mx-2 px-2 rounded-md"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{task.title}</p>
                          <p className="text-xs text-muted">{task.client?.displayName ?? "Internal"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={priorityInfo.variant}>{priorityInfo.label}</Badge>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <GoalsSection />
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "attention" | "overdue" }) {
  return (
    <div className="rounded-lg bg-surface/60 p-3">
      <p
        className={
          accent === "overdue" && value > 0
            ? "text-2xl font-semibold text-status-overdue"
            : accent === "attention" && value > 0
              ? "text-2xl font-semibold text-status-attention"
              : "text-2xl font-semibold text-foreground"
        }
      >
        {value}
      </p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function NextBestTaskCard({
  taskId,
  title,
  priority,
  client,
  dueDate,
  estimatedMinutes,
}: {
  taskId: string;
  title: string;
  priority: string;
  client?: string;
  dueDate: string | null;
  estimatedMinutes: number | null;
}) {
  const router = useRouter();
  const priorityInfo = PRIORITY_MAP[priority];
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted">{client ?? "Internal task"}</p>
        </div>
        <Badge variant={priorityInfo.variant}>{priorityInfo.label}</Badge>
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-muted">
        {dueDate && <span>Due {new Date(dueDate).toLocaleDateString()}</span>}
        {estimatedMinutes && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {estimatedMinutes} min
          </span>
        )}
      </div>
      <Button onClick={() => router.push(`/focus/${taskId}`)} className="mt-1 w-full sm:w-auto">
        Start task <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function GoalsSection() {
  const { data: goals, isLoading } = useGoals();
  const deleteGoal = useDeleteGoal();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Target className="h-4 w-4 text-brand-600" /> Goals
        </CardTitle>
        <NewGoalDialog />
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-16 w-full" />}
        {!isLoading && (!goals || goals.length === 0) && (
          <EmptyState title="No goals set yet." description="Set a productivity target to track against." />
        )}
        {!isLoading && goals && goals.length > 0 && (
          <div className="flex flex-col gap-4">
            {goals.map((goal) => (
              <div key={goal.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{GOAL_TYPE_LABELS[goal.type] ?? goal.type}</span>
                    <span className="text-muted">
                      {goal.dataAvailable ? `${goal.currentValue}% / ${goal.targetValue}%` : "No data yet"}
                    </span>
                  </div>
                  <Progress value={goal.dataAvailable ? Math.min(goal.currentValue, 100) : 0} className="mt-1" />
                </div>
                <button
                  onClick={() => deleteGoal.mutate(goal.id)}
                  className="text-muted hover:text-status-overdue"
                  aria-label="Remove goal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
