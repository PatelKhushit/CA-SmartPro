import { z } from "zod";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const TAN_REGEX = /^[A-Z]{4}[0-9]{5}[A-Z]$/;

const optionalPattern = (regex: RegExp, message: string) =>
  z
    .string()
    .optional()
    .refine((v) => !v || regex.test(v), { message });

export const createClientSchema = z.object({
  displayName: z.string().min(1, "Client name is required.").max(160),
  legalName: z.string().max(200).optional(),
  businessType: z.string().optional(),
  pan: optionalPattern(PAN_REGEX, "PAN must look like ABCDE1234F."),
  gstin: optionalPattern(GSTIN_REGEX, "GSTIN format looks invalid."),
  tan: optionalPattern(TAN_REGEX, "TAN must look like ABCD12345E."),
  email: z.string().email("Enter a valid email.").optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  notes: z.string().max(2000).optional(),
});
export type CreateClientInput = z.infer<typeof createClientSchema>;
