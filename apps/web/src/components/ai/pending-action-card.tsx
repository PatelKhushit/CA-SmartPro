"use client";

import { Check, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCancelAiAction, useConfirmAiAction, type AiPendingAction } from "@/hooks/use-ai";
import { ApiClientError } from "@/lib/api-client";

/**
 * Renders a proposed AI write-action (create_task/create_followup) that has
 * NOT happened yet — the backend only creates the underlying record once
 * the user clicks Confirm here, via POST /ai/actions/:id/confirm. This is
 * the UI half of the server-enforced confirm-before-write boundary; the
 * enforcement itself lives in AiService.confirmAction.
 */
export function PendingActionCard({ action, conversationId }: { action: AiPendingAction; conversationId: string }) {
  const confirm = useConfirmAiAction(conversationId);
  const cancel = useCancelAiAction(conversationId);
  const busy = confirm.isPending || cancel.isPending;

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-xl border border-ai-100 bg-ai-50 px-4 py-3 text-sm">
        <div className="mb-2 flex items-center gap-1.5 text-ai-700">
          <Sparkles className="h-3.5 w-3.5" />
          <span className="text-xs font-medium uppercase tracking-wide">Awaiting your confirmation</span>
        </div>
        <p className="mb-3 text-foreground">{action.summary}</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={busy}
            onClick={async () => {
              try {
                await confirm.mutateAsync(action.id);
                toast.success("Created.");
              } catch (err) {
                toast.error(err instanceof ApiClientError ? err.message : "Couldn't confirm this action.");
              }
            }}
          >
            {confirm.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Confirm
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={async () => {
              try {
                await cancel.mutateAsync(action.id);
              } catch (err) {
                toast.error(err instanceof ApiClientError ? err.message : "Couldn't cancel this action.");
              }
            }}
          >
            {cancel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
