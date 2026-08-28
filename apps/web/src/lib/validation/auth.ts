import { z } from "zod";

const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters.")
  .max(128)
  .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Include an uppercase letter, a lowercase letter, and a number.");

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  firmName: z.string().min(2, "Firm name is required.").max(120),
  fullName: z.string().min(2, "Your name is required.").max(120),
  email: z.string().email("Enter a valid email address."),
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;
