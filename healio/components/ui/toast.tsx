import type { ButtonHTMLAttributes, HTMLAttributes } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type ToastVariant = "info" | "success" | "warning" | "error";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

const variantClasses: Record<ToastVariant, string> = {
  info: "border-primary/20 bg-surface",
  success: "border-success/20 bg-surface",
  warning: "border-warning/20 bg-surface",
  error: "border-danger/20 bg-surface",
};

const accentClasses: Record<ToastVariant, string> = {
  info: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-danger",
};

export function ToastViewport({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(100vw-2rem,24rem)] flex-col gap-3",
        className,
      )}
      {...props}
    />
  );
}

interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  toast: ToastItem;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss, className, ...props }: ToastProps) {
  const variant = toast.variant ?? "info";
  return (
    <div
      role="status"
      aria-live="polite"
      className={cx(
        "pointer-events-auto relative overflow-hidden rounded-card border shadow-card",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      <div className={cx("absolute inset-y-0 left-0 w-1.5", accentClasses[variant])} />
      <div className="flex items-start gap-3 p-4 pl-5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{toast.title}</p>
          {toast.description ? (
            <p className="mt-1 text-sm leading-5 text-muted">{toast.description}</p>
          ) : null}
        </div>
        <ToastCloseButton
          aria-label="Dismiss toast"
          onClick={onDismiss}
          className="h-8 w-8 rounded-full text-muted hover:bg-slate-100 hover:text-ink"
        >
          ×
        </ToastCloseButton>
      </div>
    </div>
  );
}

function ToastCloseButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex items-center justify-center transition-colors",
        className,
      )}
      {...props}
    />
  );
}
