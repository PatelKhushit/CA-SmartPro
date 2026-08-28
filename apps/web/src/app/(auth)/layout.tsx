import { LogoMark } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark className="h-10 w-10" />
          <h1 className="mt-4 text-xl font-semibold text-foreground">CA SmartPro</h1>
          <p className="mt-1 text-sm text-muted">Manage Clients. Tasks. Compliance. Growth.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
