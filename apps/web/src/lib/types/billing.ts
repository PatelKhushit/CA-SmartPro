export type FeeFrequency = "ONE_TIME" | "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "ANNUALLY";
export type InvoiceStatus = "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "UPI" | "CHEQUE" | "CARD" | "OTHER";

export interface FeePlan {
  id: string;
  clientId: string;
  client: { id: string; displayName: string; clientCode: string };
  name: string;
  amount: string;
  frequency: FeeFrequency;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  notes: string | null;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
}

export interface InvoicePaymentSummary {
  id: string;
  amount: string;
  paymentDate: string;
  method: PaymentMethod;
  referenceNumber: string | null;
}

export interface Invoice {
  id: string;
  clientId: string;
  client: { id: string; displayName: string; clientCode: string; pan: string | null; gstin: string | null };
  feePlan: { id: string; name: string } | null;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  amountPaid: string;
  notes: string | null;
  createdBy: { id: string; fullName: string };
  lineItems: InvoiceLineItem[];
  payments: InvoicePaymentSummary[];
}

export interface Payment {
  id: string;
  clientId: string;
  client: { id: string; displayName: string; clientCode: string };
  invoiceId: string;
  invoice: { id: string; invoiceNumber: string; totalAmount: string };
  amount: string;
  paymentDate: string;
  method: PaymentMethod;
  referenceNumber: string | null;
  notes: string | null;
  recordedBy: { id: string; fullName: string };
}

export interface BillingSummary {
  activeFeePlans: number;
  outstandingInvoices: number;
  totalOutstanding: number;
  overdueInvoices: number;
  collectedThisMonth: number;
}

export const FEE_FREQUENCY_LABELS: Record<FeeFrequency, string> = {
  ONE_TIME: "One-time",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  HALF_YEARLY: "Half-yearly",
  ANNUALLY: "Annually",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

export const INVOICE_STATUS_VARIANT: Record<InvoiceStatus, "neutral" | "attention" | "completed" | "overdue" | "upcoming" | "inProgress" | "cancelled"> = {
  DRAFT: "neutral",
  SENT: "upcoming",
  PARTIALLY_PAID: "attention",
  PAID: "completed",
  CANCELLED: "cancelled",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  UPI: "UPI",
  CHEQUE: "Cheque",
  CARD: "Card",
  OTHER: "Other",
};
