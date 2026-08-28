import { cn } from "@/lib/utils";

interface LogoMarkProps {
  className?: string;
  /** "default" for use on light backgrounds; "on-dark" for the navy sidebar. */
  variant?: "default" | "on-dark";
}

/**
 * CA SmartPro icon mark: rounded square, "CA" monogram, small emerald growth
 * tick. "on-dark" swaps the square to royal blue so it stays legible against
 * the navy sidebar instead of disappearing into it.
 */
export function LogoMark({ className, variant = "default" }: LogoMarkProps) {
  const squareFill = variant === "on-dark" ? "#1565D8" : "#01142A";
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-8 w-8", className)}
      role="img"
      aria-label="CA SmartPro"
    >
      <rect width="32" height="32" rx="9" fill={squareFill} />
      <text
        x="16"
        y="22"
        textAnchor="middle"
        fontFamily="var(--font-sans, ui-sans-serif), sans-serif"
        fontWeight={700}
        fontSize="14"
        fill="#ffffff"
        letterSpacing="-0.5"
      >
        CA
      </text>
      <path
        d="M22.5 10.5 L26 7 M26 7 L23.4 7 M26 7 L26 9.6"
        stroke="#00A651"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

interface LogoProps extends LogoMarkProps {
  showWordmark?: boolean;
}

/** Full lockup: icon mark + "CA SmartPro" wordmark. */
export function Logo({ className, variant = "default", showWordmark = true }: LogoProps) {
  const textColor = variant === "on-dark" ? "text-navy-foreground" : "text-foreground";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LogoMark variant={variant} />
      {showWordmark && <span className={cn("text-sm font-semibold tracking-tight", textColor)}>CA SmartPro</span>}
    </div>
  );
}
