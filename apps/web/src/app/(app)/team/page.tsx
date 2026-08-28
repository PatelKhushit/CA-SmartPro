import { UserCog } from "lucide-react";
import { ComingSoonPage } from "@/components/layout/coming-soon-page";

export default function TeamPage() {
  return (
    <ComingSoonPage
      title="Team"
      icon={UserCog}
      description="Inviting team members, assigning roles and viewing workload is planned — today, roles/permissions are seeded system-wide but there's no in-app user management UI yet."
    />
  );
}
