"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAiStatus } from "@/hooks/use-ai";

export interface AiInsightHighlight {
  text: string;
  href: string;
}

/**
 * The highlight lines below are plain deterministic counts computed by the
 * caller from real query data (see my-day/page.tsx) — never claimed to be
 * "AI-generated." That distinction matters: misrepresenting a count as AI
 * analysis would be exactly the kind of fake insight the product spec bans.
 * The open-ended "Ask CA Copilot" CTA is where real AI-generated answers
 * live (see /copilot), reading the same data through controlled tools.
 */
export function AiCopilotCard({ highlights = [] }: { highlights?: AiInsightHighlight[] }) {
  const { data: status } = useAiStatus();

  return (
    <Card className="border-ai-100 bg-ai-50/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-ai-700">
          <Sparkles className="h-4 w-4 text-ai-500" /> CA Copilot
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {highlights.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {highlights.map((h) => (
              <li key={h.text}>
                <Link href={h.href} className="text-sm text-foreground hover:underline">
                  {h.text}
                </Link>
              </li>
            ))}
          </ul>
        ) : status && !status.configured ? (
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
