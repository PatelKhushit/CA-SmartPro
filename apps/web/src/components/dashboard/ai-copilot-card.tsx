"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAiStatus } from "@/hooks/use-ai";

/**
 * Deliberately subtle and honest: no fabricated "insights" (e.g. a fake
 * "3 compliance items due" line) — that would misrepresent deterministic
 * stats as AI-generated analysis. Real AI-generated summaries belong inside
 * an actual conversation (see /copilot), not simulated here.
 */
export function AiCopilotCard() {
  const { data: status } = useAiStatus();

  return (
    <Card className="border-ai-100 bg-ai-50/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-ai-700">
          <Sparkles className="h-4 w-4 text-ai-500" /> CA Copilot
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {status && !status.configured ? (
          <p className="text-sm text-muted">
            AI Copilot isn&apos;t configured in this environment yet. It&apos;s fully wired end to end and will start
            answering as soon as a key is added.
          </p>
        ) : (
          <p className="text-sm text-muted">
            Ask about today&apos;s priorities, a client&apos;s status, or overdue compliance — CA Copilot reads your
            real practice data through controlled tools, nothing invented.
          </p>
        )}
        <Button asChild size="sm" variant="outline" className="w-fit border-ai-100 text-ai-700 hover:bg-ai-100">
          <Link href="/copilot">Ask CA Copilot</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
