import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted-surface text-muted">
        <WifiOff className="h-6 w-6" />
      </div>
      <div>
        <h1 className="text-lg font-semibold text-foreground">You&apos;re offline.</h1>
        <p className="mt-1 max-w-sm text-sm text-muted">
          This page needs a connection to load. Client, task, and compliance data is never cached for offline use, so
          reconnect and try again — nothing shown here is stale data.
        </p>
      </div>
    </div>
  );
}
