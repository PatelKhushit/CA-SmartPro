"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth, ApiClientError } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginInput) => {
    try {
      await login(values.email, values.password);
      router.push("/my-day");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError("root", { message: err.message });
      } else {
        toast.error(t("auth.login.genericError"));
      }
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t("auth.login.emailLabel")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <p id="email-error" className="text-xs text-status-overdue">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t("auth.login.passwordLabel")}</Label>
              <Link href="/forgot-password" className="text-xs text-brand-600 hover:underline">
                {t("auth.login.forgotPassword")}
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
                className="pr-10"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p id="password-error" className="text-xs text-status-overdue">
                {errors.password.message}
              </p>
            )}
          </div>

          {errors.root && (
            <p role="alert" className="text-sm text-status-overdue">
              {errors.root.message}
            </p>
          )}

          <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? t("auth.login.submitting") : t("auth.login.submit")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {t("auth.login.newHere")}{" "}
          <Link href="/register" className="font-medium text-brand-600 hover:underline">
            {t("auth.login.createWorkspace")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
