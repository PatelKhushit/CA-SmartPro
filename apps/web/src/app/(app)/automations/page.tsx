import { Workflow } from "lucide-react";
import { ComingSoonPage } from "@/components/layout/coming-soon-page";

export default function AutomationsPage() {
  return (
    <ComingSoonPage
      title="Automations"
      icon={Workflow}
      description="Configurable WHEN/THEN automation rules (e.g. compliance due in 3 days → reminder) are planned — reminders and notifications already run today, just not as user-configurable rules yet."
    />
  );
}
