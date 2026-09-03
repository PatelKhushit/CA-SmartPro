export type BusinessType =
  | "PROPRIETORSHIP"
  | "PARTNERSHIP"
  | "LLP"
  | "PRIVATE_LIMITED"
  | "PUBLIC_LIMITED"
  | "HUF"
  | "INDIVIDUAL"
  | "TRUST"
  | "OTHER";

export type ClientStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export type ServiceCategory = "GST" | "TDS" | "INCOME_TAX" | "AUDIT" | "ROC" | "PAYROLL" | "OTHER";
export type ClientServiceStatus = "ACTIVE" | "PAUSED" | "ENDED";

export interface ClientContact {
  id: string;
  name: string;
  designation: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
}

export interface ClientService {
  id: string;
  category: ServiceCategory;
  name: string;
  startDate: string;
  endDate: string | null;
  status: ClientServiceStatus;
  notes: string | null;
}

export interface ClientListItem {
  id: string;
  clientCode: string;
  displayName: string;
  businessType: BusinessType;
  status: ClientStatus;
  gstin: string | null;
  pan: string | null;
  cinOrLlpin: string | null;
  assignedUser: { id: string; fullName: string } | null;
  services: { category: ServiceCategory }[];
  _count: { services: number; tasks: number };
}

export interface ClientDetail extends Omit<ClientListItem, "_count"> {
  legalName: string | null;
  tan: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  notes: string | null;
  createdAt: string;
  createdBy: { id: string; fullName: string };
  contacts: ClientContact[];
  services: ClientService[];
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  PROPRIETORSHIP: "Proprietorship",
  PARTNERSHIP: "Partnership",
  LLP: "LLP",
  PRIVATE_LIMITED: "Private Limited",
  PUBLIC_LIMITED: "Public Limited",
  HUF: "HUF",
  INDIVIDUAL: "Individual",
  TRUST: "Trust",
  OTHER: "Other",
};

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  GST: "GST",
  TDS: "TDS",
  INCOME_TAX: "Income Tax",
  AUDIT: "Audit",
  ROC: "ROC",
  PAYROLL: "Payroll",
  OTHER: "Other",
};
