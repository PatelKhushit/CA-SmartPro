"use client";

import * as React from "react";
import { useQueries } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, LabelList } from "recharts";
import { api } from "@/lib/api-client";
import type { MonthlyReport } from "@/hooks/use-reports";
import { PremiumCard, PremiumCardHeader } from "./premium-card";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Last 6 months (oldest to newest), as "YYYY-MM" keys the /reports/monthly API expects. */
function lastSixMonths(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

export function MonthlyOverviewChart() {
  const months = React.useMemo(() => lastSixMonths(), []);

  const results = useQueries({
    queries: months.map((month) => ({
      queryKey: ["reports", "monthly", month],
      queryFn: () => api.get<MonthlyReport>(`/reports/monthly?month=${month}`),
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const hasError = results.some((r) => r.isError);

  const data = results.map((r, i) => {
    const [year, monthNum] = months[i]!.split("-");
    return {
      month: MONTH_LABELS[Number(monthNum) - 1],
      year,
      accuracy: r.data?.productivityPercent ?? 0,
    };
  });

  return (
    <PremiumCard className="flex h-full flex-col">
      <PremiumCardHeader title="Monthly Overview" />
      <p className="-mt-3 mb-3 text-xs" style={{ color: "var(--dash-text-secondary)" }}>
        Task completion accuracy (%)
      </p>
      {hasError ? (
        <div className="flex flex-1 items-center justify-center py-8">
          <p className="text-sm" style={{ color: "var(--dash-text-secondary)" }}>
            Unable to load this section.
          </p>
        </div>
      ) : isLoading ? (
        <div className="h-56 w-full animate-pulse rounded-lg" style={{ background: "var(--dash-border)" }} />
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--dash-border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tick={{ fill: "var(--dash-text-secondary)", fontSize: 12 }}
                axisLine={{ stroke: "var(--dash-border)" }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tick={{ fill: "var(--dash-text-secondary)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "var(--dash-surface-2)" }}
                contentStyle={{
                  background: "var(--dash-surface)",
                  border: "1px solid var(--dash-border)",
                  borderRadius: 8,
                  color: "var(--dash-text-primary)",
                  fontSize: 12,
                }}
                formatter={(value: number) => [`${value}%`, "Accuracy"]}
              />
              <Bar dataKey="accuracy" fill="var(--dash-accent)" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={600}>
                <LabelList
                  dataKey="accuracy"
                  position="top"
                  formatter={(v: number) => `${v}%`}
                  style={{ fill: "var(--dash-text-secondary)", fontSize: 11 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </PremiumCard>
  );
}
