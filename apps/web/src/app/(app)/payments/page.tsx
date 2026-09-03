"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Wallet, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePayments, useRemovePayment } from "@/hooks/use-billing";
import { PAYMENT_METHOD_LABELS } from "@/lib/types/billing";
import { useAuth } from "@/lib/auth-context";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiClientError } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n/language-context";

export default function PaymentsPage() {
  const { hasPermission } = useAuth();
  const { t } = useLanguage();
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const {
    data: payments,
    isLoading,
    isError,
    refetch,
  } = usePayments({ search: debouncedSearch || undefined });
  const removePayment = useRemovePayment();

  const canManage = hasPermission("payments.manage");

  const deletePayment = async (id: string) => {
    try {
      await removePayment.mutateAsync(id);
      toast.success("Payment removed.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't remove this payment.");
    }
  };

  if (!hasPermission("payments.view")) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-foreground">{t("pages.payments.title")}</h1>
        <EmptyState icon={Wallet} title="You don't have access to Payments." description="Ask a Firm Admin or Manager to grant payments.view if you need this." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("pages.payments.title")}</h1>
          <p className="text-sm text-muted">{t("pages.payments.description")}</p>
        </div>
        <Input placeholder="Search client, invoice #, reference…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:w-72" />
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}
      {isError && <ErrorState description="We couldn't load payments." onRetry={() => refetch()} />}
      {!isLoading && !isError && payments && payments.items.length === 0 && (
        <EmptyState icon={Wallet} title="No payments recorded yet." description="Record a payment from an invoice's detail page." />
      )}
      {!isLoading && !isError && payments && payments.items.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Recorded by</TableHead>
              {canManage && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.items.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-muted">{new Date(p.paymentDate).toLocaleDateString()}</TableCell>
                <TableCell className="font-medium text-foreground">{p.client.displayName}</TableCell>
                <TableCell>
                  <Link href={`/invoices/${p.invoiceId}`} className="text-brand-600 hover:underline">
                    {p.invoice.invoiceNumber}
                  </Link>
                </TableCell>
                <TableCell className="text-muted">{PAYMENT_METHOD_LABELS[p.method]}</TableCell>
                <TableCell className="text-muted">{p.referenceNumber ?? "—"}</TableCell>
                <TableCell className="text-foreground">₹{Number(p.amount).toFixed(2)}</TableCell>
                <TableCell className="text-muted">{p.recordedBy.fullName}</TableCell>
                {canManage && (
                  <TableCell>
                    <Button size="icon" variant="ghost" aria-label="Remove payment" onClick={() => deletePayment(p.id)}>
                      <Trash2 className="h-4 w-4 text-muted" />
                    </Button>
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
