import Link from "next/link";

const groups = [
  {
    title: "Product",
    links: [
      ["Features", "#features"],
      ["Booking", "#how-it-works"],
      ["Patients", "#features"],
      ["Billing", "#billing"],
      ["Analytics", "#features"],
      ["Pricing", "#billing"],
    ],
  },
  {
    title: "Trust",
    links: [
      ["Security", "#security"],
      ["Auditability", "#security"],
      ["Status", "#security"],
    ],
  },
  {
    title: "Company",
    links: [
      ["Contact", "/signup?intent=demo"],
      ["Docs", "#faq"],
      ["Login", "/login"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["Privacy", "#security"],
      ["Terms", "#security"],
    ],
  },
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/80 bg-white/70">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-[1.1fr_1.9fr]">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white">H</span>
              Healio
            </div>
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted">
              Multi-tenant clinic operations software for appointments, patient records, billing, reminders, and day-to-day team workflows.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {groups.map((group) => (
              <div key={group.title}>
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  {group.title}
                </h2>
                <ul className="mt-3 space-y-2">
                  {group.links.map(([label, href]) => (
                    <li key={label}>
                      <Link href={href} className="text-sm text-ink/90 hover:text-primary">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-10 text-xs text-muted">© {new Date().getFullYear()} Healio. Built for solo clinics and growing multi-provider teams.</p>
      </div>
    </footer>
  );
}
