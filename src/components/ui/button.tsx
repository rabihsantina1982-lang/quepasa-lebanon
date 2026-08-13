import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "accent";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-[var(--color-primary)] text-[var(--color-primary-fg)] hover:opacity-90",
  accent: "bg-[var(--color-accent)] text-white hover:opacity-90",
  secondary: "bg-[var(--color-card)] text-[var(--color-fg)] border border-[var(--color-border)] hover:bg-[var(--color-bg)]",
  outline: "bg-transparent text-[var(--color-fg)] border border-[var(--color-border)] hover:bg-[var(--color-card)]",
  ghost: "bg-transparent text-[var(--color-fg)] hover:bg-[var(--color-card)]",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-pill)] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
