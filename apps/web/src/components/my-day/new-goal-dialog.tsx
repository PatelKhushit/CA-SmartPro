"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateGoal } from "@/hooks/use-goals";
import { currentPeriodRange } from "@/lib/date-periods";
import { ApiClientError } from "@/lib/api-client";

const GOAL_TYPE_LABELS: Record<string, string> = {
  DAILY_PRODUCTIVITY: "Daily productivity",
  WEEKLY_PRODUCTIVITY: "Weekly productivity",
  MONTHLY_PRODUCTIVITY: "Monthly productivity",
};

export function NewGoalDialog() {
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState("DAILY_PRODUCTIVITY");
  const [targetValue, setTargetValue] = React.useState("95");
  const createGoal = useCreateGoal();

  const submit = async () => {
    try {
      const { start, end } = currentPeriodRange(type as "DAILY_PRODUCTIVITY" | "WEEKLY_PRODUCTIVITY" | "MONTHLY_PRODUCTIVITY");
      await createGoal.mutateAsync({
        type,
        unit: "PERCENT",
        targetValue: Number(targetValue),
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
      });
      toast.success("Goal set.");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't save this goal.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4" /> Set a goal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set a productivity goal</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-type">Goal</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="goal-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(GOAL_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-target">Target (%)</Label>
            <Input id="goal-target" type="number" min={1} max={100} value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!targetValue || createGoal.isPending} onClick={submit}>
            {createGoal.isPending ? "Saving…" : "Set goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { GOAL_TYPE_LABELS };
