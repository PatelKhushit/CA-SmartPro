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
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";

export default function RegisterPage() {
  const { register: registerFirm } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
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
        toast.error(t("auth.register.genericError"));
      }
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="firmName">{t("auth.register.firmNameLabel")}</Label>
            <Input
              id="firmName"
              invalid={!!errors.firmName}
              placeholder="Patel & Associates"
              {...register("firmName")}
            />
            {errors.firmName && <p className="text-xs text-status-overdue">{errors.firmName.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fullName">{t("auth.register.fullNameLabel")}</Label>
            <Input id="fullName" invalid={!!errors.fullName} {...register("fullName")} />
            {errors.fullName && <p className="text-xs text-status-overdue">{errors.fullName.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t("auth.register.emailLabel")}</Label>
            <Input id="email" type="email" autoComplete="email" invalid={!!errors.email} {...register("email")} />
            {errors.email && <p className="text-xs text-status-overdue">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">{t("auth.register.passwordLabel")}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                invalid={!!errors.password}
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
            {isSubmitting ? t("auth.register.submitting") : t("auth.register.submit")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {t("auth.register.haveAccount")}{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            {t("auth.register.signIn")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
