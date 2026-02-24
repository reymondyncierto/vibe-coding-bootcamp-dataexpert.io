import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-app/95 px-4 py-4 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Today
          </p>
          <h1 className="truncate text-lg font-semibold text-ink md:text-xl">
            Dashboard Overview
          </h1>
        </div>
        <div className="hidden w-72 md:block">
          <Input aria-label="Search patients or invoices" placeholder="Search patients, invoices..." name="dashboardSearch" />
        </div>
        <Badge variant="primary">Solo Plan</Badge>
      </div>
    </header>
  );
}
