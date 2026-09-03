import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted-surface text-muted">
        <Compass className="h-6 w-6" />
      </div>
      <div>
        <h1 className="text-lg font-semibold text-foreground">Page not found.</h1>
        <p className="mt-1 max-w-sm text-sm text-muted">
          The page you&apos;re looking for doesn&apos;t exist, or you may not have access to it.
        </p>
      </div>
      <Button asChild>
        <Link href="/my-day">Go to My Day</Link>
      </Button>
    </div>
  );
}
