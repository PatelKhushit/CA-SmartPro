import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { PaginatedResult } from "@/lib/types/client";
import type { BillingSummary, FeeFrequency, FeePlan, Invoice, InvoiceStatus, Payment, PaymentMethod } from "@/lib/types/billing";

export function useBillingSummary() {
  return useQuery({ queryKey: ["billing", "summary"], queryFn: () => api.get<BillingSummary>("/billing/summary") });
}

// --- Fee Plans ---

export interface FeePlanFilters {
  clientId?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

function buildFeePlanQuery(filters: FeePlanFilters) {
  const params = new URLSearchParams();
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.isActive !== undefined) params.set("isActive", String(filters.isActive));
  if (filters.search) params.set("search", filters.search);
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 20));
  return params.toString();
}

export function useFeePlans(filters: FeePlanFilters) {
  return useQuery({
    queryKey: ["billing", "fee-plans", filters],
    queryFn: () => api.get<PaginatedResult<FeePlan>>(`/billing/fee-plans?${buildFeePlanQuery(filters)}`),
  });
}

export function useCreateFeePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { clientId: string; name: string; amount: number; frequency?: FeeFrequency; startDate: string; endDate?: string; notes?: string }) =>
      api.post<FeePlan>("/billing/fee-plans", input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["billing"] }),
  });
}

export function useUpdateFeePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; name?: string; amount?: number; frequency?: FeeFrequency; isActive?: boolean; notes?: string }) =>
      api.patch<FeePlan>(`/billing/fee-plans/${id}`, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["billing"] }),
  });
}

export function useGenerateInvoiceFromFeePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, issueDate, dueDate }: { id: string; issueDate: string; dueDate: string }) =>
      api.post<Invoice>(`/billing/fee-plans/${id}/generate-invoice`, { issueDate, dueDate }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["billing"] }),
  });
}

// --- Invoices ---

export interface InvoiceFilters {
  clientId?: string;
  status?: InvoiceStatus;
  view?: "overdue";
  search?: string;
  page?: number;
  pageSize?: number;
}

function buildInvoiceQuery(filters: InvoiceFilters) {
  const params = new URLSearchParams();
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.status) params.set("status", filters.status);
  if (filters.view) params.set("view", filters.view);
  if (filters.search) params.set("search", filters.search);
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 20));
  return params.toString();
}

export function useInvoices(filters: InvoiceFilters) {
  return useQuery({
    queryKey: ["billing", "invoices", filters],
    queryFn: () => api.get<PaginatedResult<Invoice>>(`/billing/invoices?${buildInvoiceQuery(filters)}`),
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ["billing", "invoices", id],
    queryFn: () => api.get<Invoice>(`/billing/invoices/${id}`),
    enabled: !!id,
  });
}

export interface InvoiceLineItemInput {
  description: string;
  quantity?: number;
  unitPrice: number;
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { clientId: string; feePlanId?: string; issueDate: string; dueDate: string; lineItems: InvoiceLineItemInput[]; taxAmount?: number; notes?: string }) =>
      api.post<Invoice>("/billing/invoices", input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["billing"] }),
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string;
      issueDate?: string;
      dueDate?: string;
      lineItems?: InvoiceLineItemInput[];
      taxAmount?: number;
      status?: "DRAFT" | "SENT" | "CANCELLED";
      notes?: string;
    }) => api.patch<Invoice>(`/billing/invoices/${id}`, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["billing"] }),
  });
}

// --- Payments ---

export interface PaymentFilters {
  clientId?: string;
  invoiceId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

function buildPaymentQuery(filters: PaymentFilters) {
  const params = new URLSearchParams();
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.invoiceId) params.set("invoiceId", filters.invoiceId);
  if (filters.search) params.set("search", filters.search);
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 20));
  return params.toString();
}

export function usePayments(filters: PaymentFilters) {
  return useQuery({
    queryKey: ["billing", "payments", filters],
    queryFn: () => api.get<PaginatedResult<Payment>>(`/billing/payments?${buildPaymentQuery(filters)}`),
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { invoiceId: string; amount: number; paymentDate: string; method: PaymentMethod; referenceNumber?: string; notes?: string }) =>
      api.post<Payment>("/billing/payments", input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["billing"] }),
  });
}

export function useRemovePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/billing/payments/${id}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["billing"] }),
  });
}
