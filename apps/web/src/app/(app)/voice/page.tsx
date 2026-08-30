"use client";

import * as React from "react";
import { toast } from "sonner";
import { Mic, MicOff, Send, Volume2, VolumeX, AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  useAiStatus,
  useAiConversations,
  useAiConversation,
  useCreateAiConversation,
  useSendAiMessage,
} from "@/hooks/use-ai";
import { useAuth } from "@/lib/auth-context";
import { ApiClientError } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n/language-context";

// The Web Speech API isn't in TypeScript's DOM lib — these are the minimal
// shapes this page actually uses, not a claim of full spec coverage.
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function VoiceAssistantPage() {
  const { hasPermission } = useAuth();
  const { t } = useLanguage();
  const { data: status } = useAiStatus();
  const { data: conversations } = useAiConversations();
  const [activeId, setActiveId] = React.useState<string | undefined>(undefined);
  const resolvedId = activeId ?? conversations?.[0]?.id;
  const createConversation = useCreateAiConversation();
  const { data: conversation } = useAiConversation(resolvedId);
  const sendMessage = useSendAiMessage(resolvedId ?? "");

  const [supported, setSupported] = React.useState<boolean | null>(null);
  const [listening, setListening] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [speakReplies, setSpeakReplies] = React.useState(true);
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const lastSpokenMessageId = React.useRef<string | null>(null);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(!!getSpeechRecognition());
  }, []);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [conversation?.messages.length]);

  // Speak the assistant's most recent reply once, when it lands.
  React.useEffect(() => {
    if (!speakReplies || !conversation) return;
    const last = conversation.messages[conversation.messages.length - 1];
    if (!last || last.role !== "ASSISTANT" || last.id === lastSpokenMessageId.current) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    lastSpokenMessageId.current = last.id;
    const utterance = new SpeechSynthesisUtterance(last.content.replace(/[*#_`]/g, ""));
    window.speechSynthesis.speak(utterance);
  }, [conversation, speakReplies]);

  const startListening = () => {
    const Recognition = getSpeechRecognition();
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognition.onresult = (ev) => {
      let text = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        text += ev.results[i][0].transcript;
      }
      setDraft(text);
    };
    recognition.onerror = () => {
      setListening(false);
      toast.error("We couldn't hear that. Check your microphone permission and try again.");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setDraft("");
    setListening(true);
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const send = async (text: string, source: "TEXT" | "VOICE") => {
    if (!text.trim()) return;
    let convId = resolvedId;
    if (!convId) {
      const conv = await createConversation.mutateAsync();
      convId = conv.id;
      setActiveId(convId);
    }
    setDraft("");
    try {
      await sendMessage.mutateAsync({ text: text.trim(), source });
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't reach the AI Copilot.");
    }
  };

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col gap-4 md:h-[calc(100vh-6.5rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t("pages.voice.title")}</h1>
          <p className="text-sm text-muted">{t("pages.voice.subtitle")}</p>
        </div>
        <Button variant="ghost" size="icon" aria-label={speakReplies ? "Mute replies" : "Unmute replies"} onClick={() => setSpeakReplies((v) => !v)}>
          {speakReplies ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-muted" />}
        </Button>
      </div>

      {status && !status.configured && (
        <div className="flex items-start gap-2 rounded-lg border border-status-attention-bg bg-status-attention-bg p-3 text-sm text-status-attention">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>AI Copilot is not configured in this environment yet (no <code>AI_API_KEY</code>). Voice input still works — replies will start arriving once a key is added.</p>
        </div>
      )}

      {!hasPermission("ai.actions") && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted-surface p-3 text-sm text-muted">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>You can ask questions by voice, but you don&apos;t have permission to let the assistant create tasks or follow-ups (ai.actions). Ask a Firm Admin if you need this.</p>
        </div>
      )}

      {supported === false && (
        <div className="flex items-start gap-2 rounded-lg border border-status-overdue-bg bg-status-overdue-bg p-3 text-sm text-status-overdue">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Voice input isn&apos;t supported in this browser. Try Chrome or Edge on desktop, or use the text-based CA Copilot instead.</p>
        </div>
      )}

      <Card className="flex flex-1 flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          {!conversation && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted">
              <Mic className="h-8 w-8" />
              <p className="text-sm">Press the microphone and ask something like &ldquo;What&apos;s overdue today?&rdquo;</p>
            </div>
          )}
          {conversation && (
            <div className="flex flex-col gap-4">
              {conversation.messages.map((m) => (
                <div key={m.id} className={cn("flex", m.role === "USER" ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[80%] rounded-xl px-4 py-2 text-sm whitespace-pre-wrap", m.role === "USER" ? "bg-brand-600 text-white" : "bg-muted-surface text-foreground")}>
                    {m.content}
                    {m.toolName && <p className="mt-1 text-[10px] opacity-70">via {m.toolName.replace(/,/g, ", ")}</p>}
                  </div>
                </div>
              ))}
              {sendMessage.isPending && <div className="flex justify-start"><div className="rounded-xl bg-muted-surface px-4 py-2 text-sm text-muted">Thinking…</div></div>}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-border p-3">
          {draft && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted-surface px-3 py-2 text-sm">
              <span className="flex-1 text-foreground">{draft}</span>
              <Button size="icon" variant="ghost" aria-label="Discard" onClick={() => setDraft("")}>
                <RotateCcw className="h-4 w-4 text-muted" />
              </Button>
              <Button size="icon" aria-label="Send" onClick={() => send(draft, "VOICE")} disabled={listening || sendMessage.isPending}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="flex items-center justify-center">
            <Button
              size="lg"
              className={cn("h-14 w-14 rounded-full p-0", listening && "animate-pulse bg-status-overdue hover:bg-status-overdue")}
              disabled={supported === false}
              aria-label={listening ? "Stop listening" : "Start listening"}
              onClick={listening ? stopListening : startListening}
            >
              {listening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
