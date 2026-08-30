export type NewsCategory = "GST" | "TDS" | "INCOME_TAX" | "COMPANY_LAW" | "AUDIT" | "ICAI" | "OTHER";

export interface NewsArticle {
  id: string;
  title: string;
  link: string;
  sourceName: string;
  publishedAt: string | null;
  summary: string;
  category: NewsCategory;
}

export interface NewsListResult {
  items: NewsArticle[];
  fetchedAt: string;
  sources: string[];
  failedSources: string[];
}

export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  GST: "GST",
  TDS: "TDS",
  INCOME_TAX: "Income Tax",
  COMPANY_LAW: "Company Law / ROC",
  AUDIT: "Audit & Assurance",
  ICAI: "ICAI / Professional",
  OTHER: "Other",
};
