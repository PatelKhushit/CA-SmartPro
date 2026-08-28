"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { NewEventDialog } from "@/components/calendar/new-event-dialog";
import { useCalendarRange, type CalendarItem } from "@/hooks/use-calendar";
import { COMPLIANCE_STATUS_MAP, effectiveTaskStatus } from "@/lib/status";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

const TYPE_LABELS: Record<CalendarItem["sourceType"], string> = {
  TASK: "Task",
  COMPLIANCE: "Compliance",
  CLIENT_MEETING: "Client meeting",
  INTERNAL_MEETING: "Internal meeting",
  OTHER: "Other",
};

function itemBadge(item: CalendarItem) {
  if (item.sourceType === "TASK") return effectiveTaskStatus(item.startAt, item.status);
  if (item.sourceType === "COMPLIANCE") return COMPLIANCE_STATUS_MAP[item.status] ?? COMPLIANCE_STATUS_MAP.UPCOMING;
  return { label: TYPE_LABELS[item.sourceType], variant: "brand" as const };
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function CalendarPage() {
  const [cursor, setCursor] = React.useState(() => new Date());
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);
  const [typeFilter, setTypeFilter] = React.useState<CalendarItem["sourceType"] | "ALL">("ALL");

  const { gridStart, gridEnd } = React.useMemo(() => {
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(monthStart);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // back to Monday
    const end = new Date(start);
    end.setDate(start.getDate() + 41); // 6 weeks
    return { gridStart: start, gridEnd: end };
  }, [cursor]);

  const { data, isLoading, isError, refetch } = useCalendarRange(gridStart, gridEnd);

  const items = React.useMemo(
    () => (data ?? []).filter((i) => typeFilter === "ALL" || i.sourceType === typeFilter),
    [data, typeFilter],
  );

  const days = React.useMemo(() => {
    const result: Date[] = [];
    const d = new Date(gridStart);
    while (d <= gridEnd) {
      result.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return result;
  }, [gridStart, gridEnd]);

  const itemsByDay = React.useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const key = new Date(item.startAt).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [items]);

  const selectedItems = selectedDay ? (itemsByDay.get(selectedDay.toDateString()) ?? []) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Calendar</h1>
          <p className="text-sm text-muted">Compliance deadlines, task due dates, and meetings — one view.</p>
        </div>
        <NewEventDialog defaultDate={selectedDay ?? undefined} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="w-40 text-center text-sm font-medium text-foreground">
            {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </p>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
            Today
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["ALL", "TASK", "COMPLIANCE", "CLIENT_MEETING", "INTERNAL_MEETING", "OTHER"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium",
                typeFilter === t ? "border-brand-600 bg-brand-50 text-brand-700" : "border-border text-muted hover:bg-muted-surface",
              )}
            >
              {t === "ALL" ? "All" : TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <Skeleton className="h-96 w-full" />}
      {isError && <ErrorState description="We couldn't load the calendar. Please check your connection and try again." onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="overflow-hidden rounded-xl border border-border lg:col-span-2">
            <div className="grid grid-cols-7 bg-muted-surface text-center text-xs font-medium text-muted">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="py-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const inMonth = day.getMonth() === cursor.getMonth();
                const dayItems = itemsByDay.get(day.toDateString()) ?? [];
                const isToday = sameDay(day, new Date());
                const isSelected = selectedDay && sameDay(day, selectedDay);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "flex min-h-24 flex-col gap-1 border-b border-r border-border p-1.5 text-left align-top",
                      !inMonth && "bg-muted-surface/40 text-muted",
                      isSelected && "bg-brand-50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full text-xs",
                        isToday && "bg-brand-600 font-semibold text-white",
                      )}
                    >
                      {day.getDate()}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      {dayItems.slice(0, 2).map((item) => {
                        const badge = itemBadge(item);
                        return (
                          <span
                            key={item.id}
                            className="truncate rounded px-1 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor:
                                badge.variant === "completed"
                                  ? "var(--status-completed-bg)"
                                  : badge.variant === "overdue"
                                    ? "var(--status-overdue-bg)"
                                    : badge.variant === "attention"
                                      ? "var(--status-attention-bg)"
                                      : badge.variant === "cancelled"
                                        ? "var(--status-cancelled-bg)"
                                        : "var(--brand-50)",
                              color:
                                badge.variant === "completed"
                                  ? "var(--status-completed)"
                                  : badge.variant === "overdue"
                                    ? "var(--status-overdue)"
                                    : badge.variant === "attention"
                                      ? "var(--status-attention)"
                                      : badge.variant === "cancelled"
                                        ? "var(--status-cancelled)"
                                        : "var(--brand-700)",
                            }}
                          >
                            {item.title}
                          </span>
                        );
                      })}
                      {dayItems.length > 2 && <span className="text-[10px] text-muted">+{dayItems.length - 2} more</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <p className="mb-3 text-sm font-medium text-foreground">
                {selectedDay ? selectedDay.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }) : "Select a day"}
              </p>
              {selectedDay && selectedItems.length === 0 && <EmptyState icon={CalendarDays} title="Nothing scheduled." />}
              <div className="flex flex-col gap-3">
                {selectedItems.map((item) => {
                  const badge = itemBadge(item);
                  return (
                    <div key={item.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {TYPE_LABELS[item.sourceType]}
                        {item.clientName && ` · ${item.clientName}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
