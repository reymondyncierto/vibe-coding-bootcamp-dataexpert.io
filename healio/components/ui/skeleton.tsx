import type { HTMLAttributes } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cx(
        "animate-pulse rounded-control bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200",
        className,
      )}
      {...props}
    />
  );
}
