"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n/language-context";

const schema = z.object({ email: z.string().email("Enter a valid email address.") });
type Input = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Input>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: Input) => {
    const res = await api.post<{ message: string; devOnlyResetToken?: string }>(
      "/auth/password-reset/request",
      values,
    );
    setDevToken(res.devOnlyResetToken ?? null);
    setSent(true);
  };

  if (sent) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-foreground">
            If that email exists in our system, a reset link has been sent.
          </p>
          {devToken && (
            <div className="mt-4 rounded-lg border border-dashed border-border bg-muted-surface p-3 text-left text-xs">
              <p className="font-medium text-muted">
                Development mode — email delivery is not configured (Phase 2), so here is the reset token:
              </p>
              <Link href={`/reset-password?token=${devToken}`} className="mt-2 block break-all text-brand-600 underline">
                Reset your password
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t("auth.forgotPassword.emailLabel")}</Label>
            <Input id="email" type="email" invalid={!!errors.email} {...register("email")} />
            {errors.email && <p className="text-xs text-status-overdue">{errors.email.message}</p>}
          </div>
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? t("auth.forgotPassword.submitting") : t("auth.forgotPassword.submit")}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            {t("auth.forgotPassword.backToLogin")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
