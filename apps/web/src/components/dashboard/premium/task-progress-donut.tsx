"use client";

import * as React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PremiumCard, PremiumCardHeader } from "./premium-card";

interface TaskProgressDonutProps {
  completed: number;
  inProgress: number;
  pending: number;
}

export function TaskProgressDonut({ completed, inProgress, pending }: TaskProgressDonutProps) {
  const total = completed + inProgress + pending;
  const completedPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const data = [
    { name: "Completed", value: completed, color: "var(--dash-success)" },
    { name: "In Progress", value: inProgress, color: "var(--dash-accent)" },
    { name: "Pending", value: pending, color: "var(--dash-danger)" },
  ];

  return (
    <PremiumCard className="flex h-full flex-col">
      <PremiumCardHeader title="Today's Task Progress" />
      {total === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
          <p className="text-sm" style={{ color: "var(--dash-text-secondary)" }}>
            No tasks for today.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center gap-6 sm:flex-row">
          <div className="relative h-48 w-48 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="72%"
                  outerRadius="100%"
                  paddingAngle={data.filter((d) => d.value > 0).length > 1 ? 3 : 0}
                  strokeWidth={0}
                  isAnimationActive
                  animationDuration={600}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--dash-surface)",
                    border: "1px solid var(--dash-border)",
                    borderRadius: 8,
                    color: "var(--dash-text-primary)",
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => [`${value} tasks`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-3xl font-bold" style={{ color: "var(--dash-text-primary)" }}>
                {completedPercent}%
              </p>
              <p className="text-xs" style={{ color: "var(--dash-text-secondary)" }}>
                Completed
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3">
            <LegendRow color="var(--dash-success)" label="Completed" value={completed} />
            <LegendRow color="var(--dash-accent)" label="In Progress" value={inProgress} />
            <LegendRow color="var(--dash-danger)" label="Pending" value={pending} />
            <div className="mt-1 flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--dash-border)" }}>
              <span className="text-xs font-medium" style={{ color: "var(--dash-text-secondary)" }}>
                Total Tasks
              </span>
              <span className="text-sm font-semibold" style={{ color: "var(--dash-text-primary)" }}>
                {total}
              </span>
            </div>
          </div>
        </div>
      )}
    </PremiumCard>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
        <span style={{ color: "var(--dash-text-secondary)" }}>{label}</span>
      </div>
      <span className="font-medium" style={{ color: "var(--dash-text-primary)" }}>
        {value}
      </span>
    </div>
  );
}
