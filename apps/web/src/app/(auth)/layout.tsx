"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { warmApi } from "@/lib/api-client";
import { LogoMark } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/my-day");
  }, [status, router]);

  useEffect(() => {
    // Render's free tier sleeps after ~15min idle and takes 30-50s to wake —
    // ping it as soon as the auth screen mounts so the API is already warm
    // by the time the user finishes typing their credentials.
    warmApi();
  }, []);

  if (status === "authenticated") {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="auth-shell relative flex min-h-screen flex-1 flex-col bg-background">
      <div className="absolute right-4 top-4 z-10">
        <LanguageSwitcher variant="on-dark" />
      </div>
      {/* Navy structure band stays a fixed, minority slice of the viewport —
          the off-white canvas below is the dominant surface (60-30-10:
          off-white canvas, navy structure, accent confined to the form's
          button/links), rather than a gradient sweeping saturated color
          across most of the page. */}
      <div className="flex flex-col items-center justify-center gap-2 bg-navy px-4 py-10 text-center">
        <LogoMark variant="on-dark" className="h-10 w-10" />
        <h1 className="text-xl font-semibold text-white">CA SmartPro</h1>
        <p className="text-sm text-white/70">Your Practice. Your Productivity. Your Growth.</p>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
