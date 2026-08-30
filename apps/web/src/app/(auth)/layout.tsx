import { LogoMark } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell auth-gradient relative flex min-h-screen flex-1 items-center justify-center px-4 py-12">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher variant="on-dark" />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark variant="on-dark" className="h-10 w-10" />
          <h1 className="mt-4 text-xl font-semibold text-white">CA SmartPro</h1>
          <p className="mt-1 text-sm text-white/70">Your Practice. Your Productivity. Your Growth.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
