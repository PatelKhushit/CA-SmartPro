import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-muted-surface text-muted",
        brand: "bg-brand-50 text-brand-700",
        completed: "bg-status-completed-bg text-status-completed",
        inProgress: "bg-status-in-progress-bg text-status-in-progress",
        upcoming: "bg-status-upcoming-bg text-status-upcoming",
        attention: "bg-status-attention-bg text-status-attention",
        overdue: "bg-status-overdue-bg text-status-overdue",
        blocked: "bg-status-blocked-bg text-status-blocked",
        cancelled: "bg-status-cancelled-bg text-status-cancelled",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
