"use client";

import { useRef, useState } from "react";
import { getSeasonLabel } from "../../lib/seasonHistory";

export default function SeasonSelect({
  id,
  name,
  value,
  seasons,
  valueField,
  onChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const dropdownRef = useRef(null);

  const getOptionValue = (season) =>
    valueField === "label" ? getSeasonLabel(season) : season[valueField];
  const selectedSeason = seasons.find((season) =>
    [getOptionValue(season), season.season_name].some(
      (optionValue) => String(optionValue) === String(value),
    ),
  );
  const selectedLabel = selectedSeason
    ? getSeasonLabel(selectedSeason)
    : value || "";
  const normalizedQuery = query.trim().toLowerCase();
  const filteredSeasons = seasons
    .filter((season) => {
      const type = String(season.season_type || "").toUpperCase();
      const label = getSeasonLabel(season);
      const year =
        String(season.start_date || "").slice(0, 4) ||
        String(season.season_name || "").match(/\b\d{4}\b/)?.[0] ||
        "";
      const matchesType = typeFilter === "all" || type === typeFilter;
      const matchesSearch =
        !normalizedQuery ||
        [label, year, season.season_id, season.status].some((item) =>
          String(item || "").toLowerCase().includes(normalizedQuery),
        );

      return matchesType && matchesSearch;
    })
    .sort((first, second) => {
      const firstYear = String(first.start_date || "").slice(0, 4);
      const secondYear = String(second.start_date || "").slice(0, 4);
      return secondYear.localeCompare(firstYear);
    });

  function chooseSeason(season) {
    onChange({
      target: {
        name,
        value: String(getOptionValue(season)),
      },
    });
    setQuery("");
    setIsOpen(false);
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      setIsOpen(false);
      setQuery("");
    }

    if (event.key === "Enter" && filteredSeasons.length) {
      event.preventDefault();
      chooseSeason(filteredSeasons[0]);
    }
  }

  return (
    <div ref={dropdownRef} className="relative">
      <input
        id={id}
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={`${id}-options`}
        autoComplete="off"
        required
        value={isOpen ? query : selectedLabel}
        onFocus={() => {
          setQuery("");
          setIsOpen(true);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onBlur={(event) => {
          if (!dropdownRef.current?.contains(event.relatedTarget)) {
            setIsOpen(false);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={seasons.length ? "Search or select a season" : "No seasons available"}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
      />

      {isOpen && (
        <div
          id={`${id}-options`}
          role="listbox"
          aria-label="Available seasons"
          className="absolute z-30 mt-2 max-h-80 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="border-b border-slate-100 bg-slate-50 p-2">
            <label className="sr-only" htmlFor={`${id}-category`}>
              Filter seasons by category
            </label>
            <select
              id={`${id}-category`}
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              onFocus={(event) => event.stopPropagation()}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-600"
            >
              <option value="all">All categories</option>
              <option value="WET">Wet Season</option>
              <option value="DRY">Dry Season</option>
            </select>
          </div>

          <div className="max-h-60 overflow-y-auto p-1">
            {filteredSeasons.length ? (
              filteredSeasons.map((season) => (
                <button
                  key={season.season_id}
                  type="button"
                  role="option"
                  aria-selected={
                    String(getOptionValue(season)) === String(value)
                  }
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => chooseSeason(season)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                >
                  <span className="font-semibold text-slate-800">
                    {getSeasonLabel(season)}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {season.start_date} – {season.end_date}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-4 text-center text-xs text-slate-500">
                {seasons.length
                  ? "No seasons match your search."
                  : "Create a season first to select it here."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
