import { Mic } from "lucide-react";
import { ComingSoonPage } from "@/components/layout/coming-soon-page";

export default function VoicePage() {
  return (
    <ComingSoonPage
      title="Voice Assistant"
      icon={Mic}
      description="Voice control over My Day, tasks and client lookups (speech → text → intent → confirmation → action) is planned on top of the existing AI Copilot tools — not built yet."
    />
  );
}
