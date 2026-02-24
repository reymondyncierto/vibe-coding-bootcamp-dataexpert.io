export default function HomePage() {
  return (
    <main className="min-h-screen bg-app px-6 py-12 text-ink">
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <section className="healio-card p-8">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">
          Healio
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Design-token foundation initialized
          </h1>
          <p className="mt-4 max-w-prose text-base leading-7 text-muted">
            Healio now has a paper-friendly base palette, surface tokens,
            typography defaults, and reusable card styles for upcoming dashboard
            screens.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button className="min-h-11 rounded-control bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover">
              Primary Action
            </button>
            <button className="min-h-11 rounded-control border border-border bg-surface px-4 py-2 text-sm font-medium text-ink">
              Secondary
            </button>
          </div>
        </section>

        <aside className="grid gap-4">
          <div className="healio-card p-5">
            <h2 className="text-sm font-semibold text-ink">Palette Preview</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-control border border-border bg-surface p-3">
                <p className="text-xs font-medium text-muted">Surface</p>
                <p className="mt-1 text-sm text-ink">Card / Modal</p>
              </div>
              <div className="rounded-control border border-border bg-primary/10 p-3">
                <p className="text-xs font-medium text-primary">Primary</p>
                <p className="mt-1 text-sm text-ink">Trust Accent</p>
              </div>
              <div className="rounded-control border border-border bg-success/10 p-3">
                <p className="text-xs font-medium text-success">Success</p>
                <p className="mt-1 text-sm text-ink">Completed</p>
              </div>
              <div className="rounded-control border border-border bg-warning/10 p-3">
                <p className="text-xs font-medium text-warning">Warning</p>
                <p className="mt-1 text-sm text-ink">Attention</p>
              </div>
            </div>
          </div>

          <div className="healio-card p-5">
            <p className="text-sm font-semibold text-ink">Accessibility Base</p>
            <p className="mt-2 text-sm text-muted">
              Focus rings, reduced-motion fallbacks, and selection colors are
              enabled globally for future form and dashboard components.
            </p>
            <a
              className="mt-4 inline-flex min-h-11 items-center rounded-control border border-border px-4 py-2 text-sm font-medium text-ink"
              href="#"
            >
              Focus me with Tab
            </a>
          </div>
        </aside>
      </div>
    </main>
  );
}
