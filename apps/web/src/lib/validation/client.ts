import { z } from "zod";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const TAN_REGEX = /^[A-Z]{4}[0-9]{5}[A-Z]$/;
const CIN_OR_LLPIN_REGEX = /^[A-Z0-9-]{5,21}$/;

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
  cinOrLlpin: optionalPattern(CIN_OR_LLPIN_REGEX, "CIN/LLPIN format looks invalid."),
  email: z.string().email("Enter a valid email.").optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().max(10).optional(),
  assignedUserId: z.string().optional(),
  notes: z.string().max(2000).optional(),
  // Not part of CreateClientDto — collected here for UX, then submitted as a
  // separate POST /clients/:id/contacts call once the client exists.
  contactName: z.string().max(120).optional(),
  contactDesignation: z.string().max(120).optional(),
  contactEmail: z.string().email("Enter a valid email.").optional().or(z.literal("")),
  contactPhone: z.string().max(20).optional(),
});
export type CreateClientInput = z.infer<typeof createClientSchema>;

export const CLIENT_WIZARD_STEP_FIELDS = {
  basic: ["displayName", "legalName", "businessType", "pan", "gstin", "tan", "cinOrLlpin"] as const,
  contact: [
    "email",
    "phone",
    "addressLine1",
    "addressLine2",
    "city",
    "state",
    "pincode",
    "contactName",
    "contactDesignation",
    "contactEmail",
    "contactPhone",
  ] as const,
  assignment: ["assignedUserId"] as const,
};
