import { z } from "zod";

export const createTaskSchema = z
  .object({
    title: z.string().min(1, "Title is required.").max(200),
    description: z.string().max(2000).optional(),
    clientId: z.string().optional(),
    category: z.string().optional(),
    priority: z.string().optional(),
    assignedUserId: z.string().optional(),
    startDate: z.string().optional(),
    dueDate: z.string().optional(),
    estimatedHours: z
      .string()
      .optional()
      .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) > 0 && Number(v) <= 16), {
        message: "Enter a realistic number of hours (up to 16).",
      }),
  })
  .refine((v) => !v.startDate || !v.dueDate || v.startDate <= v.dueDate, {
    message: "Due date can't be before the start date.",
    path: ["dueDate"],
  });

export type CreateTaskFormInput = z.infer<typeof createTaskSchema>;
