"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth, ApiClientError } from "@/lib/auth-context";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";

export default function RegisterPage() {
  const { register: registerFirm } = useAuth();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterInput) => {
    try {
      await registerFirm(values);
      router.push("/my-day");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError("root", { message: err.message });
      } else {
        toast.error("We couldn't create your workspace. Please check your connection and try again.");
      }
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="firmName">Firm name</Label>
            <Input
              id="firmName"
              invalid={!!errors.firmName}
              placeholder="Patel & Associates"
              {...register("firmName")}
            />
            {errors.firmName && <p className="text-xs text-status-overdue">{errors.firmName.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fullName">Your name</Label>
            <Input id="fullName" invalid={!!errors.fullName} {...register("fullName")} />
            {errors.fullName && <p className="text-xs text-status-overdue">{errors.fullName.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" type="email" autoComplete="email" invalid={!!errors.email} {...register("email")} />
            {errors.email && <p className="text-xs text-status-overdue">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password ? (
              <p className="text-xs text-status-overdue">{errors.password.message}</p>
            ) : (
              <p className="text-xs text-muted">At least 10 characters, with upper, lower and a number.</p>
            )}
          </div>

          {errors.root && (
            <p role="alert" className="text-sm text-status-overdue">
              {errors.root.message}
            </p>
          )}

          <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? "Creating workspace…" : "Create firm workspace"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have a workspace?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
