import { Percent } from "lucide-react";
import { ComingSoonPage } from "@/components/layout/coming-soon-page";

export default function TdsPage() {
  return (
    <ComingSoonPage
      title="TDS"
      icon={Percent}
      description="A dedicated TDS workspace (deductors, returns, challans, certificates) is planned — TDS-category compliance items already appear on the Compliance page today."
    />
  );
}
