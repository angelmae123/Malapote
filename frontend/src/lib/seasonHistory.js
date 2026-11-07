function findSeason(value, seasons) {
  const searchValue = String(value || "").trim().toLowerCase();
  if (!searchValue) return null;

  return seasons.find((season) =>
    [
      season.season_id,
      season.season_name,
      getSeasonLabel(season),
    ].some((candidate) => String(candidate || "").trim().toLowerCase() === searchValue),
  ) || null;
}

export function getSeasonLabel(season, fallback = "") {
  if (!season && !fallback) return "";

  const value = fallback || season?.season_name || "";
  const type = String(season?.season_type || value).toUpperCase();
  const name = type.includes("WET")
    ? "Wet Season"
    : type.includes("DRY")
      ? "Dry Season"
      : value;
  const year =
    String(season?.start_date || "").slice(0, 4) ||
    String(value).match(/\b\d{4}\b/)?.[0] ||
    "";

  return year ? `${name} ${year}` : name;
}

export function getSeasonYear(value, seasons) {
  const season = findSeason(value, seasons);
  return (
    String(season?.start_date || "").slice(0, 4) ||
    String(season?.season_name || value || "").match(/\b\d{4}\b/)?.[0] ||
    ""
  );
}

export function getSeasonType(value, seasons) {
  const season = findSeason(value, seasons);
  const type = String(season?.season_type || value || "").toUpperCase();

  if (type.includes("WET")) return "WET";
  if (type.includes("DRY")) return "DRY";
  return "";
}

export function matchesSeasonHistory(record, seasons, filters, seasonField) {
  const seasonValue = record[seasonField];
  const label = getSeasonLabel(findSeason(seasonValue, seasons), seasonValue);
  const query = filters.search.trim().toLowerCase();
  const searchableValues = [
    ...Object.values(record),
    label,
    getSeasonYear(seasonValue, seasons),
  ];

  const matchesSearch =
    !query ||
    searchableValues.some((value) =>
      String(value ?? "").toLowerCase().includes(query),
    );
  const matchesType =
    filters.type === "all" ||
    getSeasonType(seasonValue, seasons) === filters.type;
  const matchesYear =
    filters.year === "all" ||
    getSeasonYear(seasonValue, seasons) === filters.year;

  return matchesSearch && matchesType && matchesYear;
}

export function getHistoryYears(records, seasons, seasonField) {
  return [...new Set([
    ...seasons.map((season) => getSeasonYear(season.season_id, seasons)),
    ...records.map((record) => getSeasonYear(record[seasonField], seasons)),
  ].filter(Boolean))].sort((first, second) => second.localeCompare(first));
}
