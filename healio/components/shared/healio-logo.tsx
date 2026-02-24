import Link from "next/link";

import { cn } from "@/lib/utils";

type HealioLogoProps = {
  href?: string;
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
  label?: string;
  subtitle?: string;
  showLabel?: boolean;
};

function LogoInner({
  className,
  iconClassName,
  labelClassName,
  label = "Healio",
  subtitle,
  showLabel = true,
}: Omit<HealioLogoProps, "href">) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img
        src="/icon.svg"
        alt=""
        aria-hidden="true"
        className={cn("h-8 w-8 rounded-xl shadow-sm", iconClassName)}
      />
      {showLabel ? (
        <span className={cn("min-w-0", labelClassName)}>
          <span className="block truncate text-sm font-semibold text-ink">{label}</span>
          {subtitle ? (
            <span className="block truncate text-xs font-medium text-muted">{subtitle}</span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

export function HealioLogo(props: HealioLogoProps) {
  if (!props.href) {
    return <LogoInner {...props} />;
  }

  return (
    <Link
      href={props.href}
      className="inline-flex rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 ring-offset-app"
      aria-label={props.label ?? "Healio"}
    >
      <LogoInner {...props} />
    </Link>
  );
}
