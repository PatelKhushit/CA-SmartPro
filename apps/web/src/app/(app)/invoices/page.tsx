import { Receipt } from "lucide-react";
import { ComingSoonPage } from "@/components/layout/coming-soon-page";

export default function InvoicesPage() {
  return (
    <ComingSoonPage
      title="Invoices"
      icon={Receipt}
      description="Invoice creation, numbering and receipts are planned alongside the Payments module — not built yet."
    />
  );
}
