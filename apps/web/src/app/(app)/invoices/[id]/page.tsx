"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RecordPaymentDialog } from "@/components/billing/record-payment-dialog";
import { useInvoice, useUpdateInvoice, useRemovePayment } from "@/hooks/use-billing";
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_VARIANT, PAYMENT_METHOD_LABELS } from "@/lib/types/billing";
import { useAuth } from "@/lib/auth-context";
import { ApiClientError } from "@/lib/api-client";

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { data: invoice, isLoading, isError, refetch } = useInvoice(params.id);
  const updateInvoice = useUpdateInvoice();
  const removePayment = useRemovePayment();

  const canManage = hasPermission("payments.manage");

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (isError || !invoice) {
    return <ErrorState description="We couldn't load this invoice." onRetry={() => refetch()} />;
  }

  const remaining = Number(invoice.totalAmount) - Number(invoice.amountPaid);

  const markStatus = async (status: "DRAFT" | "SENT" | "CANCELLED") => {
    try {
      await updateInvoice.mutateAsync({ id: invoice.id, status });
      toast.success("Invoice updated.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't update this invoice.");
    }
  };

  const deletePayment = async (id: string) => {
    try {
      await removePayment.mutateAsync(id);
      toast.success("Payment removed.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't remove this payment.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" aria-label="Back to invoices" onClick={() => router.push("/invoices")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{invoice.invoiceNumber}</h1>
            <p className="text-sm text-muted">{invoice.client.displayName}</p>
          </div>
          <Badge variant={INVOICE_STATUS_VARIANT[invoice.status]}>{INVOICE_STATUS_LABELS[invoice.status]}</Badge>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            {invoice.status === "DRAFT" && (
              <Select value={invoice.status} onValueChange={(v) => markStatus(v as "DRAFT" | "SENT" | "CANCELLED")}>
                <SelectTrigger className="h-9 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            )}
            {(invoice.status === "SENT" || invoice.status === "PARTIALLY_PAID") && (
              <Button variant="outline" size="sm" disabled={updateInvoice.isPending} onClick={() => markStatus("CANCELLED")}>
                Cancel invoice
              </Button>
            )}
            {(invoice.status === "SENT" || invoice.status === "PARTIALLY_PAID") && <RecordPaymentDialog invoice={invoice} />}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted">Total</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-foreground">₹{Number(invoice.totalAmount).toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted">Paid</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-status-completed">₹{Number(invoice.amountPaid).toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted">Balance Due</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-foreground">₹{remaining.toFixed(2)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit price</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lineItems.map((li) => (
                <TableRow key={li.id}>
                  <TableCell>{li.description}</TableCell>
                  <TableCell className="text-muted">{Number(li.quantity)}</TableCell>
                  <TableCell className="text-muted">₹{Number(li.unitPrice).toFixed(2)}</TableCell>
                  <TableCell className="text-foreground">₹{Number(li.amount).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex flex-col items-end gap-1 text-sm">
            <div className="flex w-48 justify-between">
              <span className="text-muted">Subtotal</span>
              <span>₹{Number(invoice.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex w-48 justify-between">
              <span className="text-muted">Tax</span>
              <span>₹{Number(invoice.taxAmount).toFixed(2)}</span>
            </div>
            <div className="flex w-48 justify-between font-semibold text-foreground">
              <span>Total</span>
              <span>₹{Number(invoice.totalAmount).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {invoice.payments.length === 0 ? (
            <p className="text-sm text-muted">No payments recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Amount</TableHead>
                  {canManage && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-muted">{new Date(p.paymentDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-muted">{PAYMENT_METHOD_LABELS[p.method]}</TableCell>
                    <TableCell className="text-muted">{p.referenceNumber ?? "—"}</TableCell>
                    <TableCell className="text-foreground">₹{Number(p.amount).toFixed(2)}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}
