import { Percent } from "lucide-react";
import { ComingSoonPage } from "@/components/layout/coming-soon-page";

export default function GstPage() {
  return (
    <ComingSoonPage
      title="GST"
      icon={Percent}
      description="A dedicated GST workspace (GSTINs, returns, reconciliation, ITC, e-invoice/e-way bill) is planned as a provider-adapter integration — GST-category compliance items already appear on the Compliance page today."
    />
  );
}
