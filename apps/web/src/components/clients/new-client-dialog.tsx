"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateClient } from "@/hooks/use-clients";
import { useTeamMembers } from "@/hooks/use-team";
import { useAuth } from "@/lib/auth-context";
import { api, ApiClientError } from "@/lib/api-client";
import { createClientSchema, CLIENT_WIZARD_STEP_FIELDS, type CreateClientInput } from "@/lib/validation/client";
import { BUSINESS_TYPE_LABELS, SERVICE_CATEGORY_LABELS, type ServiceCategory } from "@/lib/types/client";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "basic", label: "Basic Info" },
  { key: "contact", label: "Contact" },
  { key: "assignment", label: "Assignment" },
  { key: "services", label: "Services" },
  { key: "review", label: "Review" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

const SERVICE_OPTIONS = Object.keys(SERVICE_CATEGORY_LABELS) as ServiceCategory[];

interface NewClientDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function NewClientDialog({ open: controlledOpen, onOpenChange: setControlledOpen, hideTrigger }: NewClientDialogProps = {}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;
  const [stepIndex, setStepIndex] = React.useState(0);
  const [selectedServices, setSelectedServices] = React.useState<ServiceCategory[]>([]);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const router = useRouter();
  const { hasPermission } = useAuth();
  const createClient = useCreateClient();
  const { data: teamMembers } = useTeamMembers({ enabled: open && hasPermission("team.manage") });

  const {
    register,
    handleSubmit,
    trigger,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateClientInput>({ resolver: zodResolver(createClientSchema), mode: "onBlur" });

  const stepKey: StepKey = STEPS[stepIndex].key;
  const values = watch();

  const closeAndReset = () => {
    setOpen(false);
    setStepIndex(0);
    setSelectedServices([]);
    setSubmitError(null);
    reset();
  };

  const goNext = async () => {
    if (stepKey === "basic" || stepKey === "contact" || stepKey === "assignment") {
      const valid = await trigger(CLIENT_WIZARD_STEP_FIELDS[stepKey] as unknown as (keyof CreateClientInput)[]);
      if (!valid) return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  const toggleService = (category: ServiceCategory) => {
    setSelectedServices((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]));
  };

  const onSubmit = async (formValues: CreateClientInput) => {
    setSubmitError(null);
    const { contactName, contactDesignation, contactEmail, contactPhone, ...clientFields } = formValues;
    const cleanedClient = Object.fromEntries(
      Object.entries(clientFields).filter(([, v]) => v !== "" && v !== undefined),
    ) as CreateClientInput;

    let clientId: string;
    try {
      const client = await createClient.mutateAsync(cleanedClient);
      clientId = client.id;
    } catch (err) {
      setSubmitError(err instanceof ApiClientError ? err.message : "We couldn't save this client. Please check your connection and try again.");
      return;
    }

    // The client now exists — contact and services are separate sub-resources,
    // attached in follow-up calls rather than useAddContact/useAddService (whose
    // clientId is a hook argument closed over at render time, before this
    // client existed — calling the raw API here with the id we just got back
    // avoids that stale-closure trap entirely).
    const followUpFailures: string[] = [];
    if (contactName?.trim()) {
      try {
        await api.post(`/clients/${clientId}/contacts`, {
          name: contactName.trim(),
          designation: contactDesignation || undefined,
          email: contactEmail || undefined,
          phone: contactPhone || undefined,
          isPrimary: true,
        });
      } catch {
        followUpFailures.push("primary contact");
      }
    }
    for (const category of selectedServices) {
      try {
        await api.post(`/clients/${clientId}/services`, { category, name: SERVICE_CATEGORY_LABELS[category] });
      } catch {
        followUpFailures.push(SERVICE_CATEGORY_LABELS[category]);
      }
    }

    toast.success(`${cleanedClient.displayName} added.`);
    if (followUpFailures.length > 0) {
      toast.error(`Client created, but couldn't save: ${followUpFailures.join(", ")}. Add these from the client profile.`);
    }
    closeAndReset();
    router.push(`/clients/${clientId}`);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeAndReset())}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4" /> New client
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a client</DialogTitle>
          <DialogDescription>Only the client name is required — fill in the rest anytime.</DialogDescription>
        </DialogHeader>

        <div className="mb-2 flex items-center gap-2">
          {STEPS.map((step, i) => (
            <div key={step.key} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                  i < stepIndex
                    ? "bg-brand-600 text-white"
                    : i === stepIndex
                      ? "border-2 border-brand-600 text-brand-600"
                      : "border border-border text-muted",
                )}
              >
                {i < stepIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={cn("hidden text-xs sm:inline", i === stepIndex ? "font-medium text-foreground" : "text-muted")}>
                {step.label}
              </span>
              {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          {stepKey === "basic" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="displayName">Client name</Label>
                <Input id="displayName" invalid={!!errors.displayName} {...register("displayName")} />
                {errors.displayName && <p className="text-xs text-status-overdue">{errors.displayName.message}</p>}
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="legalName">Legal name</Label>
                <Input id="legalName" invalid={!!errors.legalName} {...register("legalName")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="businessType">Business type</Label>
                <Select onValueChange={(v) => setValue("businessType", v)} value={watch("businessType")}>
                  <SelectTrigger id="businessType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BUSINESS_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pan">PAN</Label>
                <Input id="pan" placeholder="ABCDE1234F" className="uppercase" invalid={!!errors.pan} {...register("pan")} />
                {errors.pan && <p className="text-xs text-status-overdue">{errors.pan.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="gstin">GSTIN</Label>
                <Input id="gstin" className="uppercase" invalid={!!errors.gstin} {...register("gstin")} />
                {errors.gstin && <p className="text-xs text-status-overdue">{errors.gstin.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tan">TAN</Label>
                <Input id="tan" placeholder="ABCD12345E" className="uppercase" invalid={!!errors.tan} {...register("tan")} />
                {errors.tan && <p className="text-xs text-status-overdue">{errors.tan.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cinOrLlpin">CIN / LLPIN</Label>
                <Input
                  id="cinOrLlpin"
                  placeholder="U12345MH2020PTC123456"
                  className="uppercase"
                  invalid={!!errors.cinOrLlpin}
                  {...register("cinOrLlpin")}
                />
                {errors.cinOrLlpin && <p className="text-xs text-status-overdue">{errors.cinOrLlpin.message}</p>}
              </div>
            </div>
          )}

          {stepKey === "contact" && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Client email</Label>
                  <Input id="email" type="email" invalid={!!errors.email} {...register("email")} />
                  {errors.email && <p className="text-xs text-status-overdue">{errors.email.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="phone">Client mobile</Label>
                  <Input id="phone" {...register("phone")} />
                </div>
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label htmlFor="addressLine1">Address</Label>
                  <Input id="addressLine1" placeholder="Address line 1" {...register("addressLine1")} />
                  <Input id="addressLine2" placeholder="Address line 2 (optional)" {...register("addressLine2")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" {...register("city")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" {...register("state")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input id="pincode" {...register("pincode")} />
                </div>
              </div>

              <div className="rounded-lg border border-border p-3">
                <p className="mb-3 text-sm font-medium text-foreground">Primary contact person (optional)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="contactName">Name</Label>
                    <Input id="contactName" {...register("contactName")} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="contactDesignation">Designation</Label>
                    <Input id="contactDesignation" {...register("contactDesignation")} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="contactEmail">Email</Label>
                    <Input id="contactEmail" type="email" invalid={!!errors.contactEmail} {...register("contactEmail")} />
                    {errors.contactEmail && <p className="text-xs text-status-overdue">{errors.contactEmail.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="contactPhone">Mobile</Label>
                    <Input id="contactPhone" {...register("contactPhone")} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {stepKey === "assignment" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assignedUserId">Assigned CA / Staff</Label>
              {hasPermission("team.manage") ? (
                <Select onValueChange={(v) => setValue("assignedUserId", v)} value={watch("assignedUserId")}>
                  <SelectTrigger id="assignedUserId">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers?.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.fullName} · {member.role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted">
                  You don&apos;t have permission to view the team list. The client will be left unassigned — a
                  firm admin or manager can assign it later.
                </p>
              )}
            </div>
          )}

          {stepKey === "services" && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted">Select the services this client engages you for.</p>
              <div className="grid grid-cols-2 gap-3">
                {SERVICE_OPTIONS.map((category) => (
                  <label key={category} className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                    <Checkbox
                      checked={selectedServices.includes(category)}
                      onCheckedChange={() => toggleService(category)}
                    />
                    {SERVICE_CATEGORY_LABELS[category]}
                  </label>
                ))}
              </div>
            </div>
          )}

          {stepKey === "review" && (
            <div className="flex flex-col gap-3 text-sm">
              <ReviewRow label="Client name" value={values.displayName} />
              <ReviewRow label="Legal name" value={values.legalName} />
              <ReviewRow label="Business type" value={values.businessType ? BUSINESS_TYPE_LABELS[values.businessType as keyof typeof BUSINESS_TYPE_LABELS] : undefined} />
              <ReviewRow label="PAN" value={values.pan} />
              <ReviewRow label="GSTIN" value={values.gstin} />
              <ReviewRow label="TAN" value={values.tan} />
              <ReviewRow label="CIN / LLPIN" value={values.cinOrLlpin} />
              <ReviewRow label="Email" value={values.email} />
              <ReviewRow label="Mobile" value={values.phone} />
              <ReviewRow
                label="Address"
                value={[values.addressLine1, values.addressLine2, values.city, values.state, values.pincode].filter(Boolean).join(", ")}
              />
              <ReviewRow label="Primary contact" value={values.contactName} />
              <ReviewRow
                label="Assigned to"
                value={teamMembers?.find((m) => m.id === values.assignedUserId)?.fullName}
              />
              <ReviewRow
                label="Services"
                value={selectedServices.length > 0 ? selectedServices.map((c) => SERVICE_CATEGORY_LABELS[c]).join(", ") : undefined}
              />
              {submitError && <p className="text-sm text-status-overdue">{submitError}</p>}
            </div>
          )}

          <DialogFooter className="mt-2 flex items-center justify-between sm:justify-between">
            <Button type="button" variant="outline" onClick={stepIndex === 0 ? closeAndReset : goBack}>
              {stepIndex === 0 ? "Cancel" : (
                <>
                  <ChevronLeft className="h-4 w-4" /> Back
                </>
              )}
            </Button>
            {stepKey === "review" ? (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating…" : "Create client"}
              </Button>
            ) : (
              <Button type="button" onClick={goNext}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-1.5 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-foreground">{value || "—"}</span>
    </div>
  );
}
