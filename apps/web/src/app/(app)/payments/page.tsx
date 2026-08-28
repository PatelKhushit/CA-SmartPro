import { Wallet } from "lucide-react";
import { ComingSoonPage } from "@/components/layout/coming-soon-page";

export default function PaymentsPage() {
  return (
    <ComingSoonPage
      title="Payments"
      icon={Wallet}
      description="Payment tracking, outstanding/overdue balances and a payment gateway integration are planned — no invoice/payment ledger exists yet, so this stays honestly empty rather than showing invented figures."
    />
  );
}
