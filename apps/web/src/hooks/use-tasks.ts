import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { PaginatedResult } from "@/lib/types/client";
import type { TaskDetail, TaskListItem, TaskTemplate } from "@/lib/types/task";

export interface TaskListFilters {
  status?: string;
  priority?: string;
  clientId?: string;
  assignedUserId?: string;
  overdue?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

function buildQuery(filters: Record<string, unknown>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  return params.toString();
}

export function useTasks(filters: TaskListFilters) {
  return useQuery({
    queryKey: ["tasks", filters],
    queryFn: () => api.get<PaginatedResult<TaskListItem>>(`/tasks?${buildQuery({ ...filters })}`),
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ["tasks", id],
    queryFn: () => api.get<TaskDetail>(`/tasks/${id}`),
    enabled: !!id,
  });
}

export function useMyDay() {
  return useQuery({
    queryKey: ["tasks", "my-day"],
    queryFn: () =>
      api.get<{
        tasks: TaskListItem[];
        nextBestTask: TaskListItem | null;
        counts: {
          total: number;
          completed: number;
          pending: number;
          overdue: number;
          followUps: number;
          highPriority: number;
          productivityPercent: number;
        };
      }>("/tasks/my-day"),
    refetchInterval: 60_000,
  });
}

function useInvalidateTasks() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
  };
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  clientId?: string;
  category?: string;
  priority?: string;
  dueDate?: string;
  estimatedMinutes?: number;
  assignedUserId?: string;
  checklistItems?: string[];
}

export function useCreateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => api.post<TaskDetail>("/tasks", input),
    onSuccess: invalidate,
  });
}

export function useUpdateTask(id: string) {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (input: Partial<CreateTaskInput> & { status?: string; actualMinutes?: number }) =>
      api.patch<TaskDetail>(`/tasks/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useCompleteTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (id: string) => api.post<TaskDetail>(`/tasks/${id}/complete`),
    onSuccess: invalidate,
  });
}

export function useRescheduleTask(id: string) {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (input: { dueDate: string; reason?: string }) => api.post<TaskDetail>(`/tasks/${id}/reschedule`, input),
    onSuccess: invalidate,
  });
}

export function useToggleChecklistItem(taskId: string) {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (itemId: string) => api.post<TaskDetail>(`/tasks/${taskId}/checklist/${itemId}/toggle`),
    onSuccess: invalidate,
  });
}

export function useAddTaskComment(taskId: string) {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (body: string) => api.post<TaskDetail>(`/tasks/${taskId}/comments`, { body }),
    onSuccess: invalidate,
  });
}

// --- Templates ---

export function useTaskTemplates() {
  return useQuery({
    queryKey: ["task-templates"],
    queryFn: () => api.get<TaskTemplate[]>("/task-templates"),
  });
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  category?: string;
  frequency: string;
  scope?: string;
  applicableServiceType?: string;
  defaultPriority?: string;
  estimatedMinutes?: number;
  checklistItems?: string[];
  dueDayOfPeriod?: number;
  leadDays?: number;
}

export function useCreateTaskTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTemplateInput) => api.post<TaskTemplate>("/task-templates", input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["task-templates"] }),
  });
}

export function useDeactivateTaskTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/task-templates/${id}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["task-templates"] }),
  });
}

export function useGenerateTasksNow() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: () =>
      api.post<{ templatesConsidered: number; tasksCreated: number; tasksSkippedExisting: number }>(
        "/task-templates/generate-now",
      ),
    onSuccess: invalidate,
  });
}
