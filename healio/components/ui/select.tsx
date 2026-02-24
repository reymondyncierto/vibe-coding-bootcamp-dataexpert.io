import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, hasError = false, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cx(
            "min-h-11 w-full appearance-none rounded-control border bg-surface px-3 py-2 pr-10 text-sm text-ink shadow-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
            hasError
              ? "border-danger focus-visible:ring-danger/20"
              : "border-border",
            "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-muted",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted"
        >
          ▾
        </span>
      </div>
    );
  },
);

Select.displayName = "Select";
