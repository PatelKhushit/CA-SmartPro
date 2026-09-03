"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useComplianceEvents } from "@/hooks/use-compliance-events";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}
function endOfWeek() {
  const d = endOfToday();
  d.setDate(d.getDate() + 7);
  return d;
}
function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Org-wide compliance snapshot, bucketed client-side from the real compliance-events list — no invented statuses or dates. */
export function ComplianceSnapshotCard() {
  const { data: events, isLoading } = useComplianceEvents({});
  const list = events ?? [];

  const today = startOfToday();
  const todayEnd = endOfToday();
  const weekEnd = endOfWeek();
  const monthStart = startOfMonth();

  const dueToday = list.filter((e) => {
    if (e.status === "COMPLETED" || e.status === "WAIVED") return false;
    const due = new Date(e.dueDate);
    return due >= today && due <= todayEnd;
  }).length;

  const dueThisWeek = list.filter((e) => {
    if (e.status === "COMPLETED" || e.status === "WAIVED") return false;
    const due = new Date(e.dueDate);
    return due > todayEnd && due <= weekEnd;
  }).length;

  const overdue = list.filter((e) => e.status === "OVERDUE").length;

  const completedThisMonth = list.filter((e) => {
    if (e.status !== "COMPLETED" || !e.completedAt) return false;
    return new Date(e.completedAt) >= monthStart;
  }).length;

  const rows = [
    { label: "Due today", value: dueToday, tone: "text-status-attention" },
    { label: "Due this week", value: dueThisWeek, tone: "text-foreground" },
    { label: "Overdue", value: overdue, tone: "text-status-overdue" },
    { label: "Completed this month", value: completedThisMonth, tone: "text-status-completed" },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-brand-600" /> Compliance snapshot
        </CardTitle>
        <Link href="/compliance" className="text-xs font-medium text-brand-600 hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {rows.map((row) => (
              <div key={row.label} className="rounded-lg border border-border p-3">
                <p className={`text-2xl font-semibold ${row.tone}`}>{row.value}</p>
                <p className="text-xs text-muted">{row.label}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
