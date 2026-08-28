"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarClock, Check, ExternalLink, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useComplianceEvents,
  useCompleteComplianceEvent,
  useWaiveComplianceEvent,
  type ComplianceEventStatus,
} from "@/hooks/use-compliance-events";
import { SERVICE_CATEGORY_LABELS } from "@/lib/types/client";
import { useAuth } from "@/lib/auth-context";
import { ApiClientError } from "@/lib/api-client";

const STATUS_VARIANT = {
  UPCOMING: "upcoming",
  DUE: "attention",
  OVERDUE: "overdue",
  COMPLETED: "completed",
  WAIVED: "cancelled",
} as const;

const STATUS_TABS: { value: ComplianceEventStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "DUE", label: "Due" },
  { value: "UPCOMING", label: "Upcoming" },
  { value: "COMPLETED", label: "Completed" },
];

export default function CompliancePage() {
  const { hasPermission } = useAuth();
  const [status, setStatus] = React.useState<ComplianceEventStatus | "ALL">("ALL");
  const { data, isLoading, isError, refetch } = useComplianceEvents(status === "ALL" ? {} : { status });
  const completeEvent = useCompleteComplianceEvent();
  const waiveEvent = useWaiveComplianceEvent();

  const complete = async (id: string) => {
    try {
      await completeEvent.mutateAsync(id);
      toast.success("Marked complete.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't update this item.");
    }
  };

  const waive = async (id: string) => {
    try {
      await waiveEvent.mutateAsync(id);
      toast.success("Waived.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't update this item.");
    }
  };

  if (!hasPermission("compliance.manage")) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-foreground">Compliance</h1>
        <EmptyState
          icon={CalendarClock}
          title="You don't have access to Compliance."
          description="Ask a Firm Admin or Manager to grant compliance.manage if you need this."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Compliance</h1>
        <p className="text-sm text-muted">
          Every GST/TDS/Income Tax/Audit/ROC compliance item across your clients. Rules are configured under{" "}
          <Link href="/settings" className="text-brand-600 hover:underline">
            Settings → Compliance rules
          </Link>
          .
        </p>
      </div>

      <Tabs value={status} onValueChange={(v) => setStatus(v as ComplianceEventStatus | "ALL")}>
        <TabsList>
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {isError && <ErrorState description="We couldn't load compliance items." onRetry={() => refetch()} />}

      {!isLoading && !isError && data && data.length === 0 && (
        <EmptyState icon={CalendarClock} title="No compliance items here." description="Nothing matches this filter right now." />
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Compliance</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((event) => (
              <TableRow key={event.id}>
                <TableCell>
                  <Link href={`/clients/${event.clientId}`} className="font-medium text-brand-700 hover:underline">
                    {event.client.displayName}
                  </Link>
                </TableCell>
                <TableCell className="text-foreground">
                  {event.complianceRule.name}
                  {event.complianceRule.sourceUrl && (
                    <a
                      href={event.complianceRule.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-1 inline-flex align-middle text-muted hover:text-brand-600"
                      aria-label="Source"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="neutral">{SERVICE_CATEGORY_LABELS[event.complianceRule.category]}</Badge>
                </TableCell>
                <TableCell className="text-muted">{event.periodKey}</TableCell>
                <TableCell className="text-muted">{new Date(event.dueDate).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[event.status]}>{event.status}</Badge>
                </TableCell>
                <TableCell>
                  {(event.status === "UPCOMING" || event.status === "DUE" || event.status === "OVERDUE") && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" aria-label="Mark complete" onClick={() => complete(event.id)}>
                        <Check className="h-4 w-4 text-status-completed" />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label="Waive" onClick={() => waive(event.id)}>
                        <X className="h-4 w-4 text-muted" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
