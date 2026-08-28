import { AlertOctagon } from "lucide-react";
import { ComingSoonPage } from "@/components/layout/coming-soon-page";

export default function NoticesPage() {
  return (
    <ComingSoonPage
      title="Notices"
      icon={AlertOctagon}
      description="A Notice Center to track department notices, response deadlines and status is planned — not built yet."
    />
  );
}
