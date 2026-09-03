"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, Send, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useAiStatus,
  useAiConversations,
  useAiConversation,
  useCreateAiConversation,
  useSendAiMessage,
} from "@/hooks/use-ai";
import { ApiClientError } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n/language-context";
import { toast } from "sonner";
import { PendingActionCard } from "@/components/ai/pending-action-card";

const SUGGESTIONS = [
  "What are my priority tasks today?",
  "Give me ABC Traders' current status.",
  "What compliance items are overdue?",
  "What is GST, briefly?",
];

export default function CopilotPage() {
  const { t } = useLanguage();
  const { data: status } = useAiStatus();
  const { data: conversations } = useAiConversations();
  const [selectedId, setActiveId] = React.useState<string | undefined>(undefined);
  const activeId = selectedId ?? conversations?.[0]?.id;
  const createConversation = useCreateAiConversation();
  const { data: conversation, isLoading: loadingConversation } = useAiConversation(activeId);
  const sendMessage = useSendAiMessage();
  const [input, setInput] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [conversation?.messages.length]);

  const startNewConversation = async () => {
    const conv = await createConversation.mutateAsync();
    setActiveId(conv.id);
  };

  const submit = async (text: string) => {
    if (!text.trim()) return;
    let convId = activeId;
    if (!convId) {
      const conv = await createConversation.mutateAsync();
      convId = conv.id;
      setActiveId(convId);
    }
    setInput("");
    try {
      await sendMessage.mutateAsync({ conversationId: convId, text: text.trim() });
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't reach the AI Copilot. Please try again.");
    }
  };

  return (
    <div className="flex h-[calc(100vh-8.5rem)] gap-4 md:h-[calc(100vh-6.5rem)]">
      <aside className="hidden w-56 shrink-0 flex-col gap-1 md:flex">
        <Button variant="outline" size="sm" onClick={startNewConversation} className="mb-2">
          <Plus className="h-4 w-4" /> New chat
        </Button>
        {conversations?.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveId(c.id)}
            className={cn(
              "truncate rounded-lg px-3 py-2 text-left text-sm",
              activeId === c.id ? "bg-ai-50 text-ai-700" : "text-muted hover:bg-muted-surface",
            )}
          >
            {c.title ?? "New conversation"}
          </button>
        ))}
      </aside>

      <div className="flex flex-1 flex-col">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-ai-500" />
          <h1 className="text-xl font-semibold text-foreground">{t("pages.copilot.title")}</h1>
        </div>

        {status && !status.configured && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-status-attention-bg bg-status-attention-bg p-3 text-sm text-status-attention">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              AI Copilot is not configured in this environment yet (no <code>AI_API_KEY</code>). The chat below is fully wired
              end to end — it will start answering for real as soon as a key is added. This is not a mock.
            </p>
          </div>
        )}

        <Card className="flex flex-1 flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
            {!activeId && !loadingConversation && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <Sparkles className="h-8 w-8 text-ai-500" />
                <p className="text-sm text-muted">
                  Ask about your tasks, a client&apos;s status, or a tax/GST/TDS/accounting concept.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => submit(s)}
                      className="rounded-full border border-border px-3 py-1.5 text-xs text-muted hover:bg-muted-surface"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loadingConversation && <Skeleton className="h-full w-full" />}

            {conversation && (
              <div className="flex flex-col gap-4">
                {conversation.messages.map((m) => (
                  <div key={m.id} className={cn("flex", m.role === "USER" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-xl px-4 py-2 text-sm",
                        m.role === "USER" ? "bg-brand-600 text-white whitespace-pre-wrap" : "bg-muted-surface text-foreground",
                      )}
                    >
                      {m.role === "USER" ? (
                        m.content
                      ) : (
                        <ReactMarkdown
                          components={{
                            p: (props) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                            ul: (props) => <ul className="mb-2 list-disc space-y-0.5 pl-5" {...props} />,
                            ol: (props) => <ol className="mb-2 list-decimal space-y-0.5 pl-5" {...props} />,
                            li: (props) => <li {...props} />,
                            strong: (props) => <strong className="font-semibold text-foreground" {...props} />,
                            h1: (props) => <h3 className="mb-1 mt-2 text-sm font-semibold first:mt-0" {...props} />,
                            h2: (props) => <h3 className="mb-1 mt-2 text-sm font-semibold first:mt-0" {...props} />,
                            h3: (props) => <h3 className="mb-1 mt-2 text-sm font-semibold first:mt-0" {...props} />,
                            code: (props) => <code className="rounded bg-border/60 px-1 py-0.5 text-xs" {...props} />,
                            a: (props) => <a className="text-brand-600 underline" target="_blank" rel="noreferrer" {...props} />,
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      )}
                      {m.toolName && <p className="mt-1 text-[10px] opacity-70">via {m.toolName.replace(/,/g, ", ")}</p>}
                    </div>
                  </div>
                ))}
                {conversation.pendingActions?.map((action) => (
                  <PendingActionCard key={action.id} action={action} conversationId={conversation.id} />
                ))}
                {sendMessage.isPending && (
                  <div className="flex justify-start">
                    <div className="rounded-xl bg-muted-surface px-4 py-2 text-sm text-muted">Thinking…</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 border-t border-border p-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask CA Copilot…"
              onKeyDown={(e) => e.key === "Enter" && submit(input)}
              disabled={sendMessage.isPending}
            />
            <Button onClick={() => submit(input)} disabled={!input.trim() || sendMessage.isPending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
