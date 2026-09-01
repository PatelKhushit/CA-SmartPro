"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Flame,
  ListChecks,
  Target,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { useMyDay } from "@/hooks/use-tasks";
import { useGoals, useDeleteGoal } from "@/hooks/use-goals";
import { useClients } from "@/hooks/use-clients";
import { useMonthlyReport } from "@/hooks/use-reports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { NewGoalDialog, GOAL_TYPE_LABELS } from "@/components/my-day/new-goal-dialog";
import { PRIORITY_MAP, effectiveTaskStatus } from "@/lib/status";
import { RecentClientsCard } from "@/components/dashboard/recent-clients-card";
import { AiCopilotCard } from "@/components/dashboard/ai-copilot-card";
import { RecentActivityCard } from "@/components/dashboard/recent-activity-card";
import { DashboardHeader } from "@/components/dashboard/premium/dashboard-header";
import { StatCard, StatCardSkeleton } from "@/components/dashboard/premium/stat-card";
import { TaskProgressDonut } from "@/components/dashboard/premium/task-progress-donut";
import { RecentTasksPanel } from "@/components/dashboard/premium/recent-tasks-panel";
import { MonthlyOverviewChart } from "@/components/dashboard/premium/monthly-overview-chart";
import { UpcomingRemindersPanel } from "@/components/dashboard/premium/upcoming-reminders-panel";
import { ThemeOptionsPanel } from "@/components/dashboard/premium/theme-options-panel";
import { ColorPaletteSection } from "@/components/dashboard/premium/color-palette-section";
import { KeyFeaturesSection } from "@/components/dashboard/premium/key-features-section";
import { BrandingBenefitsSection } from "@/components/dashboard/premium/branding-benefits-section";

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function accuracySubtitle(percent: number): { text: string; tone: "success" | "warning" | "muted" } {
  if (percent >= 80) return { text: "Great Progress!", tone: "success" };
  if (percent >= 50) return { text: "Keep it up!", tone: "warning" };
  return { text: "Needs attention", tone: "muted" };
}

function todayKey() {
  const d = new Date();
  return `myday_started_${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function MyDayPage() {
  const { user, hasPermission } = useAuth();
  const { t } = useLanguage();
  const { data, isLoading, isError, refetch } = useMyDay();
  const { data: clientsPage } = useClients({ status: "ACTIVE", pageSize: 1 });
  const { data: monthlyReport } = useMonthlyReport(currentMonthKey());
  const { data: lastMonthReport } = useMonthlyReport(
    (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    })(),
  );
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

  const inProgressCount = data.tasks.filter((task) => task.status === "IN_PROGRESS").length;
  const pendingCount = Math.max(0, data.counts.total - data.counts.completed - inProgressCount);

  const dailyAccuracy = data.counts.productivityPercent;
  const dailyTone = accuracySubtitle(dailyAccuracy);
  const monthlyAccuracy = monthlyReport?.productivityPercent ?? 0;
  const monthlyTone = accuracySubtitle(monthlyAccuracy);

  const activeClients = clientsPage?.total ?? 0;
  const clientDelta = lastMonthReport ? activeClients - lastMonthReport.activeClients : null;
  const clientSubtitle =
    clientDelta === null
      ? "Active this month"
      : clientDelta === 0
        ? "No change this month"
        : `${clientDelta > 0 ? "+" : ""}${clientDelta} this month`;

  return (
    <div className="flex flex-col gap-6">
      {/* Premium dashboard — follows the app's real light-dominant, navy-
          structured theme (60-30-10: off-white canvas, navy text/structure,
          one vivid accent for CTAs/highlights) via the --dash-* aliases in
          .dashboard-shell, plus a user-selectable accent. Legacy workspace
          sections below use the app's normal theme classes directly, so both
          stay visually consistent with each other and the rest of the app. */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-4">
          <DashboardHeader firstName={firstName} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : (
              <>
                <StatCard
                  icon={ListChecks}
                  label="Tasks Today"
                  value={String(data.counts.total)}
                  subtitle={`${data.counts.completed} Completed`}
                  progress={dailyAccuracy}
                  subtitleTone="muted"
                />
                <StatCard
                  icon={Target}
                  label="Daily Accuracy"
                  value={`${dailyAccuracy}%`}
                  subtitle={dailyTone.text}
                  subtitleTone={dailyTone.tone}
                  accent="success"
                />
                <StatCard
                  icon={Flame}
                  label="Monthly Accuracy"
                  value={`${monthlyAccuracy}%`}
                  subtitle={monthlyTone.text}
                  subtitleTone={monthlyTone.tone}
                  accent="accent"
                />
                <StatCard
                  icon={Users}
                  label="Active Clients"
                  value={String(activeClients)}
                  subtitle={clientSubtitle}
                  subtitleTone={clientDelta && clientDelta > 0 ? "success" : "muted"}
                  accent="warning"
                />
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TaskProgressDonut completed={data.counts.completed} inProgress={inProgressCount} pending={pendingCount} />
            <RecentTasksPanel tasks={data.tasks} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <MonthlyOverviewChart />
            <UpcomingRemindersPanel />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ColorPaletteSection />
            <KeyFeaturesSection />
          </div>

          <BrandingBenefitsSection />
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <ThemeOptionsPanel />
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("pages.myDay.subtitle", { date: dateLabel })}</h2>
        </div>
        {!started && (
          <Button size="lg" onClick={startMyDay} className="w-full sm:w-auto">
            {t("pages.myDay.startMyDay")} <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>

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

          <div className="grid gap-4 md:grid-cols-2">
            <RecentClientsCard />
            <AiCopilotCard />
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

          {hasPermission("settings.manage") && <RecentActivityCard />}

          <GoalsSection />
        </>
      )}
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
