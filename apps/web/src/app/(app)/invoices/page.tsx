"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Receipt, Wallet, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { NewInvoiceDialog } from "@/components/billing/new-invoice-dialog";
import { NewFeePlanDialog } from "@/components/billing/new-fee-plan-dialog";
import { GenerateInvoiceDialog } from "@/components/billing/generate-invoice-dialog";
import { useBillingSummary, useInvoices, useFeePlans, useUpdateFeePlan } from "@/hooks/use-billing";
import { FEE_FREQUENCY_LABELS, INVOICE_STATUS_LABELS, INVOICE_STATUS_VARIANT, type InvoiceStatus } from "@/lib/types/billing";
import { useAuth } from "@/lib/auth-context";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiClientError } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n/language-context";

const STATUS_TABS: { value: InvoiceStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
  { value: "PAID", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function InvoicesPage() {
  const { hasPermission } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = React.useState<"invoices" | "fee-plans">("invoices");

  const canManage = hasPermission("payments.manage");

  if (!hasPermission("payments.view")) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-foreground">{t("pages.invoices.title")}</h1>
        <EmptyState icon={Receipt} title="You don't have access to Invoices." description="Ask a Firm Admin or Manager to grant payments.view if you need this." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("pages.invoices.title")}</h1>
          <p className="text-sm text-muted">{t("pages.invoices.description")}</p>
        </div>
        {canManage && (tab === "invoices" ? <NewInvoiceDialog /> : <NewFeePlanDialog />)}
      </div>

      <BillingKpis />

      <Tabs value={tab} onValueChange={(v) => setTab(v as "invoices" | "fee-plans")}>
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="fee-plans">Fee Plans</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "invoices" ? <InvoicesTab /> : <FeePlansTab canManage={canManage} />}
    </div>
  );
}

function BillingKpis() {
  const { data: summary } = useBillingSummary();
  if (!summary) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <KpiCard icon={Wallet} label="Active Fee Plans" value={summary.activeFeePlans} accent="info" />
      <KpiCard icon={Receipt} label="Outstanding Invoices" value={summary.outstandingInvoices} accent="attention" />
      <KpiCard icon={AlertTriangle} label="Overdue" value={summary.overdueInvoices} accent="overdue" />
      <KpiCard icon={Clock} label="Collected This Month" value={summary.collectedThisMonth} accent="completed" />
    </div>
  );
}

function InvoicesTab() {
  const [status, setStatus] = React.useState<InvoiceStatus | "ALL">("ALL");
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const {
    data: invoices,
    isLoading,
    isError,
    refetch,
  } = useInvoices({ status: status === "ALL" ? undefined : status, search: debouncedSearch || undefined });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={status} onValueChange={(v) => setStatus(v as InvoiceStatus | "ALL")}>
          <TabsList className="flex-wrap">
            {STATUS_TABS.map((s) => (
              <TabsTrigger key={s.value} value={s.value}>
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input placeholder="Search client, invoice #…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:w-72" />
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}
      {isError && <ErrorState description="We couldn't load invoices." onRetry={() => refetch()} />}
      {!isLoading && !isError && invoices && invoices.items.length === 0 && (
        <EmptyState icon={Receipt} title="No invoices here." description="Nothing matches this filter right now." />
      )}
      {!isLoading && !isError && invoices && invoices.items.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.items.map((inv) => (
              <TableRow key={inv.id} className="cursor-pointer">
                <TableCell className="font-medium text-foreground">
                  <Link href={`/invoices/${inv.id}`} className="hover:underline">
                    {inv.invoiceNumber}
                  </Link>
                </TableCell>
                <TableCell className="text-muted">{inv.client.displayName}</TableCell>
                <TableCell className="text-muted">{new Date(inv.issueDate).toLocaleDateString()}</TableCell>
                <TableCell className="text-muted">{new Date(inv.dueDate).toLocaleDateString()}</TableCell>
                <TableCell className="text-foreground">₹{Number(inv.totalAmount).toFixed(2)}</TableCell>
                <TableCell className="text-muted">₹{Number(inv.amountPaid).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={INVOICE_STATUS_VARIANT[inv.status]}>{INVOICE_STATUS_LABELS[inv.status]}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function FeePlansTab({ canManage }: { canManage: boolean }) {
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const { data: plans, isLoading, isError, refetch } = useFeePlans({ search: debouncedSearch || undefined });
  const updateFeePlan = useUpdateFeePlan();

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateFeePlan.mutateAsync({ id, isActive });
      toast.success(isActive ? "Fee plan activated." : "Fee plan paused.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't update this fee plan.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Input placeholder="Search client, plan name…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:w-72" />

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}
      {isError && <ErrorState description="We couldn't load fee plans." onRetry={() => refetch()} />}
      {!isLoading && !isError && plans && plans.items.length === 0 && (
        <EmptyState icon={Wallet} title="No fee plans yet." description="Add a fee plan to start generating invoices from it." />
      )}
      {!isLoading && !isError && plans && plans.items.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Active</TableHead>
              {canManage && <TableHead className="w-16" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.items.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell className="font-medium text-foreground">{plan.client.displayName}</TableCell>
                <TableCell className="text-muted">{plan.name}</TableCell>
                <TableCell className="text-foreground">₹{Number(plan.amount).toFixed(2)}</TableCell>
                <TableCell className="text-muted">{FEE_FREQUENCY_LABELS[plan.frequency]}</TableCell>
                <TableCell>
                  {canManage ? (
                    <Checkbox checked={plan.isActive} onCheckedChange={(v) => toggleActive(plan.id, v === true)} />
                  ) : (
                    <Badge variant={plan.isActive ? "completed" : "neutral"}>{plan.isActive ? "Active" : "Paused"}</Badge>
                  )}
                </TableCell>
                {canManage && (
                  <TableCell>
                    <GenerateInvoiceDialog feePlan={plan} />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
