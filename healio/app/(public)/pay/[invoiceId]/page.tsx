import { PublicInvoicePaymentCard } from "@/components/billing/public-invoice-payment-card";

export default function PublicInvoicePaymentPage({
  params,
}: {
  params: { invoiceId: string };
}) {
  return (
    <main className="min-h-screen bg-app px-4 py-6 text-ink sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-card border border-border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Healio Billing</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Invoice Payment</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            A calm, paper-replacement payment experience for patients and clinic staff. Review the invoice and continue to secure checkout when ready.
          </p>
        </header>

        <PublicInvoicePaymentCard invoiceId={params.invoiceId} />
      </div>
    </main>
  );
}
