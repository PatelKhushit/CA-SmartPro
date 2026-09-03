"use client";

import * as React from "react";
import Link from "next/link";
import { Square, Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRunningTimer, useStopTimer } from "@/hooks/use-tasks";
import { ApiClientError } from "@/lib/api-client";

function formatElapsed(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

/** Shows whenever the user has a running task timer, from anywhere in the app — proof the timer is server-persisted, not tied to the Focus Mode page staying open. */
export function RunningTimerIndicator() {
  const { data: runningTimer } = useRunningTimer();
  const stopTimer = useStopTimer(runningTimer?.taskId ?? "");
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    if (!runningTimer) return;
    const anchor = new Date(runningTimer.startedAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - anchor) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [runningTimer]);

  if (!runningTimer) return null;

  const stop = async () => {
    try {
      await stopTimer.mutateAsync();
      toast.success("Timer stopped.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't stop the timer.");
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-full border border-brand-500 bg-brand-500/10 py-1 pl-3 pr-1 text-sm">
      <Timer className="h-3.5 w-3.5 text-brand-600" />
      <Link href={`/focus/${runningTimer.taskId}`} className="max-w-40 truncate font-medium text-foreground hover:underline">
        {runningTimer.task.title}
      </Link>
      <span className="font-mono tabular-nums text-brand-600">{formatElapsed(elapsed)}</span>
      <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Stop timer" onClick={stop} disabled={stopTimer.isPending}>
        <Square className="h-3 w-3" />
      </Button>
    </div>
  );
}
