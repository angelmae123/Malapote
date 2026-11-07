export default function SeasonHistoryFilters({
  search,
  onSearchChange,
  type,
  onTypeChange,
  year,
  onYearChange,
  years,
  resultCount,
  totalCount,
}) {
  return (
    <div className="space-y-3 border-b border-slate-100 bg-slate-50/70 p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_180px_140px]">
        <label className="sr-only" htmlFor="history-search">
          Search records, season, or year
        </label>
        <input
          id="history-search"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search history, season, or year"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
        />

        <label className="sr-only" htmlFor="history-season-type">
          Filter by season category
        </label>
        <select
          id="history-season-type"
          value={type}
          onChange={(event) => onTypeChange(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
        >
          <option value="all">All categories</option>
          <option value="WET">Wet Season</option>
          <option value="DRY">Dry Season</option>
        </select>

        <label className="sr-only" htmlFor="history-season-year">
          Filter by season year
        </label>
        <select
          id="history-season-year"
          value={year}
          onChange={(event) => onYearChange(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
        >
          <option value="all">All years</option>
          {years.map((seasonYear) => (
            <option key={seasonYear} value={seasonYear}>
              {seasonYear}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-slate-500">
        Showing {resultCount} of {totalCount} record(s)
      </p>
    </div>
  );
}
