import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface CalendarItem {
  id: string;
  sourceType: "TASK" | "COMPLIANCE" | "CLIENT_MEETING" | "INTERNAL_MEETING" | "OTHER";
  sourceId: string;
  title: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  status: string;
  clientId: string | null;
  clientName: string | null;
}

export function useCalendarRange(start: Date, end: Date) {
  return useQuery({
    queryKey: ["calendar", start.toISOString(), end.toISOString()],
    queryFn: () => api.get<CalendarItem[]>(`/calendar?start=${start.toISOString()}&end=${end.toISOString()}`),
  });
}

export interface CreateCalendarEventInput {
  title: string;
  description?: string;
  type?: string;
  clientId?: string;
  startAt: string;
  endAt: string;
  allDay?: boolean;
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCalendarEventInput) => api.post("/calendar", input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["calendar"] }),
  });
}
