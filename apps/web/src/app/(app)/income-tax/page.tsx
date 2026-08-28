import { Landmark } from "lucide-react";
import { ComingSoonPage } from "@/components/layout/coming-soon-page";

export default function IncomeTaxPage() {
  return (
    <ComingSoonPage
      title="Income Tax"
      icon={Landmark}
      description="ITR preparation, AIS/TIS import, tax credit/demand/refund tracking are planned — architected for a configurable tax-year model rather than a hardcoded assessment year."
    />
  );
}
