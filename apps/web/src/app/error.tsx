"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-overdue-bg text-status-overdue">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div>
        <h1 className="text-lg font-semibold text-foreground">Something went wrong.</h1>
        <p className="mt-1 max-w-sm text-sm text-muted">
          An unexpected error interrupted this page. It has not affected your saved data — try again, or head back
          to the sign-in page.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="outline" onClick={() => router.push("/login")}>
          Go to sign in
        </Button>
      </div>
    </div>
  );
}
