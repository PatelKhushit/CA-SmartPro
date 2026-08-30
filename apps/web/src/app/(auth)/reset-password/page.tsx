"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { api, ApiClientError } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n/language-context";

const schema = z
  .object({
    newPassword: z
      .string()
      .min(10, "Password must be at least 10 characters.")
      .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Include an uppercase letter, a lowercase letter, and a number."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
type Input = z.infer<typeof schema>;

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { t } = useLanguage();
  const token = params.get("token") ?? "";
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Input>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: Input) => {
    try {
      await api.post("/auth/password-reset/confirm", { token, newPassword: values.newPassword });
      toast.success("Password updated. Please sign in.");
      router.push("/login");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError("root", { message: err.message });
      } else {
        toast.error(t("auth.resetPassword.genericError"));
      }
    }
  };

  if (!token) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-sm text-muted">
          {t("auth.resetPassword.missingToken")}{" "}
          <Link href="/forgot-password" className="text-brand-600 underline">
            Request a new one
          </Link>
          .
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newPassword">{t("auth.resetPassword.newPasswordLabel")}</Label>
            <Input id="newPassword" type="password" invalid={!!errors.newPassword} {...register("newPassword")} />
            {errors.newPassword && <p className="text-xs text-status-overdue">{errors.newPassword.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">{t("auth.resetPassword.confirmPasswordLabel")}</Label>
            <Input
              id="confirmPassword"
              type="password"
              invalid={!!errors.confirmPassword}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-status-overdue">{errors.confirmPassword.message}</p>
            )}
          </div>
          {errors.root && <p className="text-sm text-status-overdue">{errors.root.message}</p>}
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? t("auth.resetPassword.submitting") : t("auth.resetPassword.submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
