import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CA SmartPro",
  description: "Your Practice. Your Productivity. Your Growth. — the practice operating system for Chartered Accountant firms.",
};

// Runs before hydration so the correct theme applies on first paint — no
// flash of the wrong theme. Reads the user's saved choice (see ThemeToggle);
// only falls back to the OS preference when nothing has been chosen yet, so
// dark mode stays optional rather than forced (spec §47). Key must match
// THEME_STORAGE_KEY in components/layout/theme-toggle.tsx.
const THEME_BOOTSTRAP_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('ca-smartpro-theme');
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The bootstrap script below sets data-theme before React hydrates,
      // which is an intentional, expected mismatch (server can't know the
      // client's saved theme) — this is the standard escape hatch every
      // theme-toggle implementation needs, not a real bug.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
