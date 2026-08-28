"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateClient } from "@/hooks/use-clients";
import { createClientSchema, type CreateClientInput } from "@/lib/validation/client";
import { BUSINESS_TYPE_LABELS } from "@/lib/types/client";
import { ApiClientError } from "@/lib/api-client";

export function NewClientDialog() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const createClient = useCreateClient();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateClientInput>({ resolver: zodResolver(createClientSchema) });

  const onSubmit = async (values: CreateClientInput) => {
    try {
      const cleaned = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== "" && v !== undefined),
      ) as CreateClientInput;
      const client = await createClient.mutateAsync(cleaned);
      toast.success(`${client.displayName} added.`);
      setOpen(false);
      reset();
      router.push(`/clients/${client.id}`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError("root", { message: err.message });
      } else {
        toast.error("We couldn't save this client. Please check your connection and try again.");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> New client
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a client</DialogTitle>
          <DialogDescription>Only the client name is required — fill in the rest anytime.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="displayName">Client name</Label>
              <Input id="displayName" invalid={!!errors.displayName} {...register("displayName")} />
              {errors.displayName && <p className="text-xs text-status-overdue">{errors.displayName.message}</p>}
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
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" invalid={!!errors.email} {...register("email")} />
              {errors.email && <p className="text-xs text-status-overdue">{errors.email.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pan">PAN</Label>
              <Input
                id="pan"
                placeholder="ABCDE1234F"
                className="uppercase"
                invalid={!!errors.pan}
                {...register("pan")}
              />
              {errors.pan && <p className="text-xs text-status-overdue">{errors.pan.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gstin">GSTIN</Label>
              <Input id="gstin" className="uppercase" invalid={!!errors.gstin} {...register("gstin")} />
              {errors.gstin && <p className="text-xs text-status-overdue">{errors.gstin.message}</p>}
            </div>
          </div>

          {errors.root && <p className="text-sm text-status-overdue">{errors.root.message}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Add client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
