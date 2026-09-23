import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

/**
 * Botones en versalitas espaciadas, sin negrita ni esquinas cortadas. En
 * retail de lujo el llamado a la accion se apoya en el aire interior y en el
 * tracking, no en el peso: un bloque en bold grita oferta.
 */
const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
  secondary:
    "border border-hairline bg-transparent text-foreground hover:border-primary hover:text-primary",
  ghost: "bg-transparent text-muted-foreground hover:text-foreground",
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button data-variant={variant}
      className={cn(
        "ui-button inline-flex items-center justify-center px-7 py-3.5 text-[11px] uppercase tracking-[0.22em] transition-all duration-300 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

