import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface AiConversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM" | "TOOL";
  content: string;
  toolName: string | null;
  createdAt: string;
}

export interface AiPendingAction {
  id: string;
  toolName: string;
  summary: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
  createdAt: string;
  expiresAt: string;
}

export function useAiStatus() {
  return useQuery({
    queryKey: ["ai", "status"],
    queryFn: () => api.get<{ configured: boolean }>("/ai/status"),
  });
}

export function useAiConversations() {
  return useQuery({
    queryKey: ["ai", "conversations"],
    queryFn: () => api.get<AiConversation[]>("/ai/conversations"),
  });
}

export function useAiConversation(id: string | undefined) {
  return useQuery({
    queryKey: ["ai", "conversations", id],
    queryFn: () => api.get<AiConversation & { messages: AiMessage[]; pendingActions: AiPendingAction[] }>(`/ai/conversations/${id}`),
    enabled: !!id,
  });
}

export function useCreateAiConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<AiConversation>("/ai/conversations"),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["ai", "conversations"] }),
  });
}

/**
 * Takes the conversation id per-call (in the mutate variables) rather than
 * as a hook argument. A hook argument gets closed over at the render that
 * created the mutation object — when a caller creates a brand-new
 * conversation and immediately sends the first message in the same
 * handler, `setActiveId(newId)` hasn't re-rendered yet, so a hook-argument
 * version would still post to the OLD (empty) id and 404. Passing it in
 * the call always uses the id the caller has in hand right now.
 */
export function useSendAiMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, text, source }: { conversationId: string; text: string; source?: "TEXT" | "VOICE" }) =>
      api.post<AiMessage>(`/ai/conversations/${conversationId}/messages`, { text, source }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["ai", "conversations", variables.conversationId] });
      void queryClient.invalidateQueries({ queryKey: ["ai", "conversations"] });
    },
  });
}

export function useConfirmAiAction(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (actionId: string) => api.post(`/ai/actions/${actionId}/confirm`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["ai", "conversations", conversationId] }),
  });
}

export function useCancelAiAction(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (actionId: string) => api.post(`/ai/actions/${actionId}/cancel`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["ai", "conversations", conversationId] }),
  });
}
