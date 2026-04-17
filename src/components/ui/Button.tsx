import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md " +
  "font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";

const SIZES: Record<Size, string> = {
  sm: "h-7 px-2.5 text-[12px]",
  md: "h-8 px-3 text-[12.5px]",
};

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] " +
    "hover:bg-accent-hover active:brightness-95",
  secondary:
    "border border-border-subtle bg-bg-panel text-fg-secondary " +
    "hover:border-border-strong hover:bg-bg-raised hover:text-fg-primary",
  ghost:
    "text-fg-secondary hover:bg-bg-raised hover:text-fg-primary",
  danger:
    "border border-status-err/40 bg-status-err/5 text-status-err " +
    "hover:bg-status-err/10 hover:border-status-err/60",
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", className, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(BASE, SIZES[size], VARIANTS[variant], className)}
      {...rest}
    />
  );
});

type ButtonLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Variant;
  size?: Size;
};

/** Anchor styled as a Button. Use for downloads and external links. */
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  function ButtonLink({ variant = "secondary", size = "md", className, ...rest }, ref) {
    return (
      <a
        ref={ref}
        className={cn(BASE, SIZES[size], VARIANTS[variant], className)}
        {...rest}
      />
    );
  }
);
