const faqs = [
  {
    q: "Can multiple staff members use Healio at the same time?",
    a: "Yes. Healio is designed for multi-user clinic teams with role-based access so front desk, doctors, and admins can work in the same clinic workspace.",
  },
  {
    q: "Does Healio support online booking?",
    a: "Yes. Healio includes a public booking flow with service, provider, slot selection, and patient intake.",
  },
  {
    q: "Can we handle billing inside Healio?",
    a: "Yes. Healio includes invoicing workflows, payment link generation, billing dashboards, and overdue tracking flows.",
  },
  {
    q: "Will this work for a solo clinic?",
    a: "Yes. The same setup supports a solo practice and can expand as you add staff or providers.",
  },
] as const;

export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-border bg-white p-5 shadow-card sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">FAQ</p>
        <h2 id="faq-heading" className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Questions clinic teams ask before switching
        </h2>
        <div className="mt-6 space-y-3">
          {faqs.map((faq) => (
            <details key={faq.q} className="group rounded-2xl border border-border bg-slate-50/70 p-4 open:bg-white">
              <summary className="cursor-pointer list-none pr-8 text-sm font-semibold text-ink marker:content-none">
                {faq.q}
                <span className="float-right text-muted transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-6 text-muted">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
