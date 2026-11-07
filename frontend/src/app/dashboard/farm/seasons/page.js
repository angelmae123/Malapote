"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../providers";
import { apiRequest } from "../../../../lib/api";

const initialForm = {
  season_type: "WET",
  start_date: "",
  end_date: "",
  status: "Upcoming",
  description: "",
};

function getResponseData(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (response?.data && typeof response.data === "object") {
    return response.data;
  }
  return [];
}

function formatDate(value) {
  if (!value) return "—";
  return String(value).split("T")[0];
}

function getSeasonName(seasonType, startDate, fallback = "") {
  const type = String(seasonType || "").toUpperCase();
  const label =
    type === "WET"
      ? "Wet Season"
      : type === "DRY"
        ? "Dry Season"
        : fallback;
  const year =
    String(startDate || "").slice(0, 4) ||
    String(fallback).match(/\b\d{4}\b/)?.[0] ||
    "";

  return year && label ? `${label} ${year}` : "";
}

function getSeasonDisplayName(season) {
  return getSeasonName(
    season.season_type,
    season.start_date,
    season.season_name,
  );
}

function getSeasonYear(season) {
  return (
    String(season.start_date || "").slice(0, 4) ||
    String(season.season_name || "").match(/\b\d{4}\b/)?.[0] ||
    ""
  );
}

export default function SeasonsPage() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [seasons, setSeasons] = useState([]);
  const [search, setSearch] = useState("");
  const [seasonTypeFilter, setSeasonTypeFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadSeasons = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setError("");
      const response = await apiRequest("seasons", { token });
      setSeasons(getResponseData(response));
    } catch (err) {
      setError(err.message || "Failed to load seasons.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(loadSeasons, 0);
    return () => window.clearTimeout(timer);
  }, [loadSeasons]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function handleEdit(season) {
    setEditingId(season.season_id);
    setForm({
      season_type: season.season_type || "WET",
      start_date: formatDate(season.start_date),
      end_date: formatDate(season.end_date),
      status: season.status || "Upcoming",
      description: season.description || "",
    });

    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!token) {
      setError("Your session has expired. Please log in again.");
      return;
    }

    if (form.end_date < form.start_date) {
      setError("End date must not be earlier than start date.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        ...form,
        season_name: getSeasonName(
          form.season_type,
          form.start_date,
        ),
        description: form.description.trim(),
      };

      if (editingId) {
        await apiRequest(`seasons/${encodeURIComponent(editingId)}`, {
          method: "PUT",
          token,
          body: payload,
        });

        setSuccess("Season updated successfully.");
      } else {
        await apiRequest("seasons", {
          method: "POST",
          token,
          body: payload,
        });

        setSuccess("Season created successfully.");
      }

      resetForm();
      await loadSeasons();
    } catch (err) {
      setError(err.message || "Unable to save season.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(season) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${season.season_name}"?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await apiRequest(
        `seasons/${encodeURIComponent(season.season_id)}`,
        {
          method: "DELETE",
          token,
        }
      );

      setSuccess("Season deleted successfully.");

      if (editingId === season.season_id) {
        resetForm();
      }

      await loadSeasons();
    } catch (err) {
      setError(err.message || "Unable to delete season.");
    }
  }

  const statusStyle = (status) => {
    const styles = {
      Upcoming: "bg-amber-100 text-amber-700",
      Ongoing: "bg-blue-100 text-blue-700",
      Completed: "bg-green-100 text-green-700",
    };

    return styles[status] || "bg-slate-100 text-slate-700";
  };

  const seasonYears = [...new Set(seasons.map(getSeasonYear).filter(Boolean))]
    .sort((first, second) => second.localeCompare(first));
  const filteredSeasons = seasons.filter((season) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [
      getSeasonDisplayName(season),
      season.season_id,
      season.season_name,
      getSeasonYear(season),
      season.status,
    ].some((value) => String(value || "").toLowerCase().includes(query));
    const matchesType =
      seasonTypeFilter === "all" ||
      String(season.season_type).toUpperCase() === seasonTypeFilter;
    const matchesYear =
      yearFilter === "all" || getSeasonYear(season) === yearFilter;

    return matchesSearch && matchesType && matchesYear;
  });

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page Header */}
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
            Farm Management
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Seasons
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Create and manage wet and dry seasons for farm operations.
          </p>
        </div>

        {/* Notifications */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Form */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {editingId ? "Edit Season" : "Add New Season"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Enter the season details below.
              </p>
            </div>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Season Name
                </label>
                <output className="flex min-h-12 w-full items-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
                  {getSeasonName(form.season_type, form.start_date) ||
                    "Choose a start date"}
                </output>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Season Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="season_type"
                  value={form.season_type}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="WET">Wet Season</option>
                  <option value="DRY">Dry Season</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="Upcoming">Upcoming</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={form.start_date}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={form.end_date}
                  onChange={handleChange}
                  min={form.start_date || undefined}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Enter season description (optional)"
                  className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Clear
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-blue-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Season"
                    : "Save Season"}
              </button>
            </div>
          </form>
        </section>

        {/* Seasons Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Season Records
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Showing {filteredSeasons.length} of {seasons.length} season record(s)
              </p>
            </div>

            <button
              type="button"
              onClick={loadSeasons}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          <div className="grid gap-3 border-b border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-[minmax(220px,1fr)_180px_140px] sm:p-5">
            <label className="sr-only" htmlFor="season-search">
              Search seasons
            </label>
            <input
              id="season-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search season name, year, or ID"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />

            <label className="sr-only" htmlFor="season-type-filter">
              Filter by season type
            </label>
            <select
              id="season-type-filter"
              value={seasonTypeFilter}
              onChange={(event) => setSeasonTypeFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All season types</option>
              <option value="WET">Wet Season</option>
              <option value="DRY">Dry Season</option>
            </select>

            <label className="sr-only" htmlFor="season-year-filter">
              Filter by year
            </label>
            <select
              id="season-year-filter"
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All years</option>
              {seasonYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-212.5 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Season ID</th>
                  <th className="px-5 py-4 font-semibold">Season Name</th>
                  <th className="px-5 py-4 font-semibold">Type</th>
                  <th className="px-5 py-4 font-semibold">Start Date</th>
                  <th className="px-5 py-4 font-semibold">End Date</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 text-center font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-10 text-center text-slate-500">
                      Loading seasons...
                    </td>
                  </tr>
                ) : seasons.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-10 text-center text-slate-500">
                      No season records found. Add your first season above.
                    </td>
                  </tr>
                ) : filteredSeasons.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-10 text-center text-slate-500">
                      No seasons match the selected search and filters.
                    </td>
                  </tr>
                ) : (
                  filteredSeasons.map((season) => (
                    <tr
                      key={season.season_id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-blue-900">
                        {season.season_id}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-800">
                        {getSeasonDisplayName(season)}
                      </td>
                      <td className="px-5 py-4">
                        {season.season_type === "WET"
                          ? "Wet Season"
                          : season.season_type === "DRY"
                            ? "Dry Season"
                            : season.season_type}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {formatDate(season.start_date)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {formatDate(season.end_date)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(season.status)}`}
                        >
                          {season.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(season)}
                            className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(season)}
                            className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
