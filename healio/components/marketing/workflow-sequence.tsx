import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  {
    number: "01",
    title: "Book",
    copy: "Let patients request slots online or schedule visits at the front desk in seconds.",
  },
  {
    number: "02",
    title: "Treat",
    copy: "Open the patient profile, review notes, and update visit details with the right context.",
  },
  {
    number: "03",
    title: "Bill",
    copy: "Generate invoices, add line items, and send payment links without switching tools.",
  },
  {
    number: "04",
    title: "Remind",
    copy: "Queue confirmations and follow-ups to reduce no-shows and late payments.",
  },
  {
    number: "05",
    title: "Track",
    copy: "Monitor daily activity, outstanding balances, and clinic performance trends.",
  },
] as const;

export function WorkflowSequence() {
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-heading" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">How It Works</p>
        <h2 id="how-it-works-heading" className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          From booking to payment, every step stays connected.
        </h2>
        <p className="max-w-3xl text-base leading-7 text-muted">
          Healio keeps appointments, patient records, billing, and reminders in one workflow so your clinic team can move quickly without losing context.
        </p>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-5">
        {steps.map((step) => (
          <Card key={step.number} className="relative overflow-hidden">
            <div className="absolute left-0 top-0 h-full w-1 bg-primary/20" aria-hidden="true" />
            <CardHeader className="pb-1">
              <p className="text-xs font-semibold tracking-[0.18em] text-primary">{step.number}</p>
              <CardTitle className="text-base">{step.title}</CardTitle>
            </CardHeader>
            <CardContent className="pb-5">
              <CardDescription className="m-0">{step.copy}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-ink">
        <span className="font-semibold">Frictionless workflow:</span> common tasks open in focused drawers and dialogs so staff stay oriented while the schedule remains visible.
      </div>
    </section>
  );
}
