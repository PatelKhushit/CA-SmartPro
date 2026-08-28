export type FieldType = "number" | "date" | "select" | "boolean";

export interface CalculatorField {
  name: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  defaultValue?: string | number | boolean;
  suffix?: string;
}

export type ResultFormat = "currency" | "percent" | "number" | "days" | "date";

export interface CalculatorConfig {
  id: string;
  title: string;
  description: string;
  endpoint: string;
  fields: CalculatorField[];
  resultLabels: Record<string, { label: string; format: ResultFormat }>;
}

export const CALCULATORS: CalculatorConfig[] = [
  {
    id: "percentage",
    title: "Percentage",
    description: "X% of Y, what percent, or percent change.",
    endpoint: "/calculators/percentage",
    fields: [
      {
        name: "mode",
        label: "Mode",
        type: "select",
        defaultValue: "OF",
        options: [
          { value: "OF", label: "A% of B" },
          { value: "IS_WHAT_PERCENT", label: "A is what % of B" },
          { value: "CHANGE", label: "% change from A to B" },
        ],
      },
      { name: "a", label: "A", type: "number", defaultValue: 10 },
      { name: "b", label: "B", type: "number", defaultValue: 100 },
    ],
    resultLabels: {
      value: { label: "Result", format: "number" },
      percent: { label: "Percent", format: "percent" },
      percentChange: { label: "Percent change", format: "percent" },
    },
  },
  {
    id: "gst",
    title: "GST",
    description: "Add or extract GST, with CGST/SGST or IGST split.",
    endpoint: "/calculators/gst",
    fields: [
      { name: "amount", label: "Amount", type: "number", defaultValue: 10000, suffix: "₹" },
      { name: "ratePercent", label: "GST rate", type: "number", defaultValue: 18, suffix: "%" },
      {
        name: "mode",
        label: "Amount is",
        type: "select",
        defaultValue: "EXCLUSIVE",
        options: [
          { value: "EXCLUSIVE", label: "Excluding GST" },
          { value: "INCLUSIVE", label: "Including GST" },
        ],
      },
      {
        name: "interState",
        label: "Supply type",
        type: "select",
        defaultValue: "false",
        options: [
          { value: "false", label: "Intra-state (CGST+SGST)" },
          { value: "true", label: "Inter-state (IGST)" },
        ],
      },
    ],
    resultLabels: {
      baseAmount: { label: "Base amount", format: "currency" },
      gstAmount: { label: "GST amount", format: "currency" },
      totalAmount: { label: "Total amount", format: "currency" },
      cgst: { label: "CGST", format: "currency" },
      sgst: { label: "SGST", format: "currency" },
      igst: { label: "IGST", format: "currency" },
    },
  },
  {
    id: "tax",
    title: "Tax estimate",
    description: "Flat-rate tax estimate — enter the rate you want to apply.",
    endpoint: "/calculators/tax",
    fields: [
      { name: "amount", label: "Taxable amount", type: "number", defaultValue: 100000, suffix: "₹" },
      { name: "ratePercent", label: "Tax rate", type: "number", defaultValue: 20, suffix: "%" },
    ],
    resultLabels: {
      taxAmount: { label: "Tax amount", format: "currency" },
      netAmount: { label: "Net amount", format: "currency" },
    },
  },
  {
    id: "tds",
    title: "TDS",
    description: "TDS deduction estimate — enter the applicable section rate.",
    endpoint: "/calculators/tds",
    fields: [
      { name: "amount", label: "Payment amount", type: "number", defaultValue: 50000, suffix: "₹" },
      { name: "ratePercent", label: "TDS rate", type: "number", defaultValue: 10, suffix: "%" },
    ],
    resultLabels: {
      tdsAmount: { label: "TDS amount", format: "currency" },
      netPayable: { label: "Net payable", format: "currency" },
    },
  },
  {
    id: "interest",
    title: "Interest",
    description: "Simple or compound interest.",
    endpoint: "/calculators/interest",
    fields: [
      { name: "principal", label: "Principal", type: "number", defaultValue: 100000, suffix: "₹" },
      { name: "annualRatePercent", label: "Annual rate", type: "number", defaultValue: 8, suffix: "%" },
      { name: "years", label: "Years", type: "number", defaultValue: 2 },
      {
        name: "mode",
        label: "Type",
        type: "select",
        defaultValue: "SIMPLE",
        options: [
          { value: "SIMPLE", label: "Simple interest" },
          { value: "COMPOUND", label: "Compound interest" },
        ],
      },
      { name: "compoundingsPerYear", label: "Compounding periods / year", type: "number", defaultValue: 1 },
    ],
    resultLabels: {
      interest: { label: "Interest", format: "currency" },
      totalAmount: { label: "Total amount", format: "currency" },
    },
  },
  {
    id: "invoice",
    title: "Invoice",
    description: "Base amount, discount, and tax → total.",
    endpoint: "/calculators/invoice",
    fields: [
      { name: "baseAmount", label: "Base amount", type: "number", defaultValue: 20000, suffix: "₹" },
      { name: "discountPercent", label: "Discount", type: "number", defaultValue: 5, suffix: "%" },
      { name: "taxPercent", label: "Tax", type: "number", defaultValue: 18, suffix: "%" },
    ],
    resultLabels: {
      discountAmount: { label: "Discount amount", format: "currency" },
      taxableAmount: { label: "Taxable amount", format: "currency" },
      taxAmount: { label: "Tax amount", format: "currency" },
      totalAmount: { label: "Total amount", format: "currency" },
    },
  },
  {
    id: "discount",
    title: "Discount",
    description: "Final price after a discount.",
    endpoint: "/calculators/discount",
    fields: [
      { name: "originalPrice", label: "Original price", type: "number", defaultValue: 1000, suffix: "₹" },
      { name: "discountPercent", label: "Discount", type: "number", defaultValue: 10, suffix: "%" },
    ],
    resultLabels: {
      amountSaved: { label: "Amount saved", format: "currency" },
      finalPrice: { label: "Final price", format: "currency" },
    },
  },
  {
    id: "profit-margin",
    title: "Profit margin",
    description: "Margin % relative to selling price.",
    endpoint: "/calculators/profit-margin",
    fields: [
      { name: "costPrice", label: "Cost price", type: "number", defaultValue: 800, suffix: "₹" },
      { name: "sellingPrice", label: "Selling price", type: "number", defaultValue: 1000, suffix: "₹" },
    ],
    resultLabels: {
      profit: { label: "Profit", format: "currency" },
      marginPercent: { label: "Margin", format: "percent" },
    },
  },
  {
    id: "markup",
    title: "Markup",
    description: "Markup % relative to cost price.",
    endpoint: "/calculators/markup",
    fields: [
      { name: "costPrice", label: "Cost price", type: "number", defaultValue: 800, suffix: "₹" },
      { name: "sellingPrice", label: "Selling price", type: "number", defaultValue: 1000, suffix: "₹" },
    ],
    resultLabels: {
      profit: { label: "Profit", format: "currency" },
      markupPercent: { label: "Markup", format: "percent" },
    },
  },
  {
    id: "date-difference",
    title: "Date difference",
    description: "Days between two dates.",
    endpoint: "/calculators/date-difference",
    fields: [
      { name: "startDate", label: "Start date", type: "date" },
      { name: "endDate", label: "End date", type: "date" },
    ],
    resultLabels: {
      days: { label: "Days", format: "days" },
      weeks: { label: "Weeks (approx.)", format: "number" },
      approxMonths: { label: "Months (approx.)", format: "number" },
    },
  },
  {
    id: "due-date",
    title: "Due date",
    description: "A reference date plus N days.",
    endpoint: "/calculators/due-date",
    fields: [
      { name: "referenceDate", label: "Reference date", type: "date" },
      { name: "offsetDays", label: "Days after", type: "number", defaultValue: 30 },
    ],
    resultLabels: {
      dueDateEpochMs: { label: "Due date", format: "date" },
    },
  },
  {
    id: "emi",
    title: "EMI",
    description: "Monthly instalment for a loan.",
    endpoint: "/calculators/emi",
    fields: [
      { name: "principal", label: "Loan amount", type: "number", defaultValue: 500000, suffix: "₹" },
      { name: "annualRatePercent", label: "Annual rate", type: "number", defaultValue: 10, suffix: "%" },
      { name: "tenureMonths", label: "Tenure (months)", type: "number", defaultValue: 24 },
    ],
    resultLabels: {
      emi: { label: "Monthly EMI", format: "currency" },
      totalPayment: { label: "Total payment", format: "currency" },
      totalInterest: { label: "Total interest", format: "currency" },
    },
  },
];
