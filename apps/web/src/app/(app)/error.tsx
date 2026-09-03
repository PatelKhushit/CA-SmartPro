"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";

export default function AppSegmentError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <ErrorState
        title="This page ran into a problem."
        description="Nothing you've saved was affected. Try again, or head back to My Day."
        onRetry={reset}
        className="max-w-md"
      />
      <Button variant="outline" size="sm" onClick={() => router.push("/my-day")}>
        Go to My Day
      </Button>
    </div>
  );
}
