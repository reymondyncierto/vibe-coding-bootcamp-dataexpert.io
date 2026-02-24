export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-blue-600">
          Healio
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Next.js monolith scaffold initialized
        </h1>
        <p className="mt-4 text-base text-slate-600">
          This is the bootstrap shell for the Healio PRD implementation. Build
          feature routes and APIs under <code className="font-mono">app/</code>.
        </p>
      </div>
    </main>
  );
}
