"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: "/demo", label: "Dashboard", icon: "⌂" },
  { href: "/demo/schedule", label: "Schedule", icon: "🗓" },
  { href: "/demo/patients", label: "Patients", icon: "👥" },
  { href: "/demo/billing", label: "Billing", icon: "₱" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 shrink-0 border-r border-border bg-surface/80 p-5 lg:flex lg:flex-col">
      <div className="healio-card p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Healio
        </p>
        <p className="mt-2 text-lg font-semibold text-ink">Northview Clinic</p>
        <p className="text-sm text-muted">Reception Desk Workspace</p>
      </div>

      <nav className="mt-5 space-y-1" aria-label="Sidebar">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/demo" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex min-h-11 items-center gap-3 rounded-control px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-ink hover:bg-slate-100",
              ].join(" ")}
            >
              <span aria-hidden="true" className="text-base">
                {item.icon}
              </span>
              <span>{item.label}</span>
              {item.label === "Billing" ? (
                <Badge className="ml-auto" variant="warning">
                  4
                </Badge>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto healio-card p-4">
        <p className="text-sm font-semibold text-ink">Your day is clear!</p>
        <p className="mt-1 text-sm text-muted">
          Use the global + button to add your first appointment, patient, or invoice.
        </p>
      </div>
    </aside>
  );
}
