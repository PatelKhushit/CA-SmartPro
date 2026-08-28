import { MessageSquare } from "lucide-react";
import { ComingSoonPage } from "@/components/layout/coming-soon-page";

export default function CommunicationPage() {
  return (
    <ComingSoonPage
      title="Communication"
      icon={MessageSquare}
      description="A unified email/WhatsApp/call/meeting timeline per client is planned — it needs a dedicated Communication entity and provider integrations that aren't wired yet."
    />
  );
}
