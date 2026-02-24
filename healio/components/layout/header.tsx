 "use client";

import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function Header() {
  const pathname = usePathname();
  const { title, subtitle } = getHeaderCopy(pathname);

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-app/95 px-4 py-4 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Healio Workspace
          </p>
          <h1 className="truncate text-lg font-semibold text-ink md:text-xl">
            {title}
          </h1>
          <p className="mt-1 truncate text-sm text-muted">{subtitle}</p>
        </div>
        <div className="hidden w-72 md:block">
          <Input aria-label="Search patients or invoices" placeholder="Search patients, invoices..." name="dashboardSearch" />
        </div>
        <Badge variant="primary">Solo Plan</Badge>
      </div>
    </header>
  );
}

function getHeaderCopy(pathname: string) {
  if (pathname.startsWith("/appointments")) {
    return {
      title: "Appointments",
      subtitle: "Switch between day and week views without leaving the dashboard.",
    };
  }
  if (pathname.startsWith("/patients")) {
    return {
      title: "Patients",
      subtitle: "Search charts quickly and spot attendance risk indicators.",
    };
  }
  if (pathname.startsWith("/billing")) {
    return {
      title: "Billing",
      subtitle: "Track collections and generate invoices in a drawer workflow.",
    };
  }
  if (pathname.startsWith("/analytics")) {
    return {
      title: "Analytics",
      subtitle: "Review trends, service mix, and collections performance.",
    };
  }
  if (pathname.startsWith("/settings")) {
    return {
      title: "Settings",
      subtitle: "Clinic profile, services, staff, billing plan, and audit controls.",
    };
  }
  return {
    title: "Dashboard Overview",
    subtitle: "Clinic operations at a glance.",
  };
}
