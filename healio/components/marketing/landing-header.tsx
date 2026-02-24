import Link from "next/link";

import { cn } from "@/lib/utils";

const navItems = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Security", href: "#security" },
  { label: "Pricing", href: "#billing" },
] as const;

function CtaLink({
  href,
  children,
  variant = "secondary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-10 items-center justify-center rounded-control px-4 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 ring-offset-app",
        variant === "primary"
          ? "bg-primary text-white hover:bg-primary-hover"
          : "border border-border bg-white/90 text-ink hover:bg-white",
      )}
    >
      {children}
    </Link>
  );
}

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-app/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
            H
          </span>
          <span>Healio</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-control px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-white hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-control px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-white hover:text-ink sm:inline-flex"
          >
            Log in
          </Link>
          <CtaLink href="/signup">Start Free</CtaLink>
          <CtaLink href="/signup?intent=demo" variant="secondary">
            Book a Demo
          </CtaLink>
        </div>
      </div>
    </header>
  );
}
