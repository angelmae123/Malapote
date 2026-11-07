export default function DashboardLoading() {
  return (
    <section
      aria-label="Loading dashboard page"
      aria-busy="true"
      className="space-y-6"
    >
      <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-blue-800" />
        Opening page...
      </div>
      <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-100" />
      <div className="h-4 w-80 max-w-full animate-pulse rounded bg-slate-100" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
        <div className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
      </div>
      <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
    </section>
  );
}
