"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/demo", label: "Home", icon: "⌂" },
  { href: "/demo/schedule", label: "Schedule", icon: "🗓" },
  { href: "/demo/patients", label: "Patients", icon: "👥" },
  { href: "/demo/billing", label: "Billing", icon: "₱" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-2 py-2 backdrop-blur lg:hidden"
    >
      <ul className="grid grid-cols-4 gap-1">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/demo" && pathname.startsWith(item.href));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={[
                  "flex min-h-12 flex-col items-center justify-center rounded-control px-2 py-1 text-xs font-medium",
                  active ? "bg-primary/10 text-primary" : "text-muted hover:text-ink",
                ].join(" ")}
              >
                <span aria-hidden="true" className="text-sm">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
