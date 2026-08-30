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
    queryFn: () => api.get<AiConversation & { messages: AiMessage[] }>(`/ai/conversations/${id}`),
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

export function useSendAiMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ text, source }: { text: string; source?: "TEXT" | "VOICE" }) =>
      api.post<AiMessage>(`/ai/conversations/${conversationId}/messages`, { text, source }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ai", "conversations", conversationId] });
      void queryClient.invalidateQueries({ queryKey: ["ai", "conversations"] });
    },
  });
}
