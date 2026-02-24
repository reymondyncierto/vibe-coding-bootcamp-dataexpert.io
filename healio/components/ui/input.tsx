import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError = false, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cx(
          "min-h-11 w-full rounded-control border bg-surface px-3 py-2 text-sm text-ink shadow-sm",
          "placeholder:text-muted/80",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          hasError
            ? "border-danger focus-visible:ring-danger/20"
            : "border-border",
          "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-muted",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
