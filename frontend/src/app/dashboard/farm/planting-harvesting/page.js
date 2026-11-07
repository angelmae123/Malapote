
"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../providers";
import { apiRequest } from "../../../../lib/api";
import SeasonHistoryFilters from "../../../../components/dashboard/SeasonHistoryFilters";
import {
  getHistoryYears,
  matchesSeasonHistory,
} from "../../../../lib/seasonHistory";

const initialForm = {
  record_code: "",
  season: "",
  field_name: "",
  crop: "Palay",
  method: "",
  planting_date: "",
  expected_harvest_date: "",
  harvested_yield: "0",
  status: "Planned",
};

const statusOptions = [
  { value: "Planned", label: "Planned" },
  { value: "Growing", label: "Growing" },
  { value: "Harvested", label: "Harvested" },
];

function getResponseData(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
}

function getSeasonForDate(seasons, date) {
  if (!date) return null;

  return (
    seasons.find((season) => {
      const startDate = String(season.start_date || "").slice(0, 10);
      const endDate = String(season.end_date || "").slice(0, 10);

      return startDate && endDate && date >= startDate && date <= endDate;
    }) || null
  );
}

function getSeasonLabel(season, date) {
  if (!season) return "";

  const seasonYear =
    String(season.season_name || "").match(/\b\d{4}\b/)?.[0] ||
    date?.slice(0, 4) ||
    String(season.start_date || "").slice(0, 4);

  const seasonType = String(season.season_type || "").toUpperCase();

  const seasonLabel =
    seasonType === "WET"
      ? "Wet Season"
      : seasonType === "DRY"
        ? "Dry Season"
        : season.season_name;

  return seasonYear ? `${seasonLabel} ${seasonYear}` : seasonLabel;
}

function formatDate(date) {
  if (!date) return "—";

  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) return date;

  return parsedDate.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusStyle(status) {
  switch (status) {
    case "Planned":
      return "bg-amber-50 text-amber-700";
    case "Growing":
      return "bg-blue-50 text-blue-700";
    case "Harvested":
      return "bg-green-50 text-green-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default function PlantingHarvesting() {
  const { session } = useAuth();

  const [records, setRecords] = useState([]);
  const [seasons, setSeasons] = useState([]);

  const [historySearch, setHistorySearch] = useState("");
  const [historyType, setHistoryType] = useState("all");
  const [historyYear, setHistoryYear] = useState("all");

  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = session?.accessToken;

  const selectedSeason = getSeasonForDate(
    seasons,
    formData.planting_date
  );

  const historyFilters = {
    search: historySearch,
    type: historyType,
    year: historyYear,
  };

  const filteredRecords = records.filter((record) =>
    matchesSeasonHistory(record, seasons, historyFilters, "season")
  );

  const historyYears = getHistoryYears(records, seasons, "season");

  const loadData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError("Your session has expired. Please sign in again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [recordResponse, seasonResponse] = await Promise.all([
        apiRequest("farm/planting-harvesting", { token }),
        apiRequest("seasons", { token }),
      ]);

      setRecords(getResponseData(recordResponse));
      setSeasons(getResponseData(seasonResponse));
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to load planting and harvesting records."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "planting_date"
        ? {
            season: getSeasonLabel(
              getSeasonForDate(seasons, value),
              value
            ),
          }
        : {}),
    }));
  };

  const resetForm = () => {
    setFormData(initialForm);
    setEditingId(null);
    setShowForm(false);
    setError("");
  };

  const handleAdd = () => {
    setFormData(initialForm);
    setEditingId(null);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const handleEdit = (record) => {
    setError("");
    setSuccess("");

    setFormData({
      record_code: record.record_code ?? "",
      season: record.season ?? "",
      field_name: record.field_name ?? "",
      crop: record.crop ?? "Palay",
      method: record.method ?? "",
      planting_date: record.planting_date ?? "",
      expected_harvest_date: record.expected_harvest_date ?? "",
      harvested_yield: String(record.harvested_yield ?? "0"),
      status: record.status ?? "Planned",
    });

    setEditingId(record.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!token) {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    if (
      !formData.planting_date ||
      !selectedSeason ||
      !formData.field_name.trim() ||
      !formData.crop.trim() ||
      !formData.status
    ) {
      setError(
        !formData.planting_date
          ? "Select a planting date to determine the season automatically."
          : !selectedSeason
            ? "No season covers the selected planting date. Check the season date ranges in your database."
            : "Please complete all required fields."
      );
      return;
    }

    const harvestedYield = Number(formData.harvested_yield);

    if (!Number.isFinite(harvestedYield) || harvestedYield < 0) {
      setError("Please enter a valid harvested yield.");
      return;
    }

    if (
      formData.expected_harvest_date &&
      formData.expected_harvest_date < formData.planting_date
    ) {
      setError(
        "Expected harvest date cannot be earlier than planting date."
      );
      return;
    }

    const payload = {
      record_code: formData.record_code.trim(),
      season: getSeasonLabel(selectedSeason, formData.planting_date),
      field_name: formData.field_name.trim(),
      crop: formData.crop.trim(),
      method: formData.method.trim(),
      planting_date: formData.planting_date || null,
      expected_harvest_date: formData.expected_harvest_date || null,
      harvested_yield: harvestedYield,
      status: formData.status,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await apiRequest(
          `farm/planting-harvesting/${editingId}`,
          {
            method: "PUT",
            token,
            body: payload,
          }
        );

        setSuccess(
          "Planting and harvesting record updated successfully."
        );
      } else {
        await apiRequest("farm/planting-harvesting", {
          method: "POST",
          token,
          body: payload,
        });

        setSuccess(
          "Planting and harvesting record added successfully."
        );
      }

      resetForm();
      await loadData();
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to save the planting and harvesting record."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete record "${record.record_code || record.id}"?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await apiRequest(
        `farm/planting-harvesting/${record.id}`,
        {
          method: "DELETE",
          token,
        }
      );

      setSuccess(
        "Planting and harvesting record deleted successfully."
      );

      await loadData();
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to delete the planting and harvesting record."
      );
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-900">
              Farm Management
            </p>

            <h1 className="font-serif text-3xl font-semibold text-slate-900">
              Planting & Harvesting
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Track planting schedules, crop progress, and harvest results.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className="rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:bg-blue-800"
          >
            + Add Planting Record
          </button>
        </div>

        {/* Alerts */}
        {error && !showForm && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Add / Edit Modal */}
        {showForm && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !saving) {
                resetForm();
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="planting-modal-title"
              className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-widest text-blue-900">
                    Farm Management
                  </p>

                  <h2
                    id="planting-modal-title"
                    className="font-serif text-xl font-semibold text-slate-900"
                  >
                    {editingId !== null
                      ? "Edit Planting Record"
                      : "Add Planting Record"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Enter the planting and harvest information.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  aria-label="Close modal"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  ×
                </button>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto px-5 py-6 sm:px-7">
                {error && (
                  <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <form
                  id="planting-form"
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                    {/* Record Code */}
                    <div>
                      <label
                        htmlFor="record_code"
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Record Code
                      </label>

                      <input
                        id="record_code"
                        type="text"
                        name="record_code"
                        value={formData.record_code}
                        onChange={handleChange}
                        placeholder="Enter record code"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
                      />
                    </div>

                    {/* Automatic Season */}
                    <div>
                      <label
                        htmlFor="season"
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Season{" "}
                        <span className="text-xs font-medium normal-case tracking-normal text-slate-400">
                          Automatic
                        </span>
                      </label>

                      <output
                        id="season"
                        aria-live="polite"
                        className={`flex min-h-12 w-full items-center rounded-xl border px-4 py-3 text-sm ${
                          selectedSeason
                            ? "border-blue-200 bg-blue-50 font-semibold text-blue-900"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                      >
                        {selectedSeason
                          ? getSeasonLabel(
                              selectedSeason,
                              formData.planting_date
                            )
                          : formData.planting_date
                            ? seasons.length
                              ? "No season covers this planting date"
                              : "Season records are not available"
                            : "Select planting date to determine season"}
                      </output>

                      {seasons.length === 0 && (
                        <p className="mt-2 text-xs text-amber-700">
                          No season records were returned. Check your seasons
                          database and API.
                        </p>
                      )}
                    </div>

                    {/* Field Name */}
                    <div>
                      <label
                        htmlFor="field_name"
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Field Name <span className="text-red-500">*</span>
                      </label>

                      <input
                        id="field_name"
                        type="text"
                        name="field_name"
                        value={formData.field_name}
                        onChange={handleChange}
                        required
                        placeholder="e.g. Field A"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
                      />
                    </div>

                    {/* Crop */}
                    <div>
                      <label
                        htmlFor="crop"
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Crop <span className="text-red-500">*</span>
                      </label>

                      <input
                        id="crop"
                        type="text"
                        name="crop"
                        value={formData.crop}
                        onChange={handleChange}
                        required
                        placeholder="e.g. Palay"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
                      />
                    </div>

                    {/* Planting Method */}
                    <div>
                      <label
                        htmlFor="method"
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Planting Method
                      </label>

                      <input
                        id="method"
                        type="text"
                        name="method"
                        value={formData.method}
                        onChange={handleChange}
                        placeholder="e.g. Direct seeding, Transplanting"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <label
                        htmlFor="status"
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Status <span className="text-red-500">*</span>
                      </label>

                      <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
                      >
                        {statusOptions.map((option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Planting Date */}
                    <div>
                      <label
                        htmlFor="planting_date"
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Planting Date{" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <input
                        id="planting_date"
                        type="date"
                        name="planting_date"
                        value={formData.planting_date}
                        onChange={handleChange}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
                      />
                    </div>

                    {/* Expected Harvest */}
                    <div>
                      <label
                        htmlFor="expected_harvest_date"
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Expected Harvest Date
                      </label>

                      <input
                        id="expected_harvest_date"
                        type="date"
                        name="expected_harvest_date"
                        value={formData.expected_harvest_date}
                        onChange={handleChange}
                        min={formData.planting_date || undefined}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
                      />
                    </div>

                    {/* Harvested Yield */}
                    <div>
                      <label
                        htmlFor="harvested_yield"
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Harvested Yield (Tons)
                      </label>

                      <input
                        id="harvested_yield"
                        type="number"
                        name="harvested_yield"
                        min="0"
                        step="0.01"
                        value={formData.harvested_yield}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
                      />
                    </div>
                  </div>
                </form>
              </div>

              {/* Modal Footer */}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  form="planting-form"
                  disabled={saving}
                  className="rounded-xl bg-blue-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingId !== null
                      ? "Update Record"
                      : "Save Record"}
                </button>
              </div>
            </section>
          </div>
        )}

        {/* Records Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Planting & Harvesting Records
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Total records: {filteredRecords.length}
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="text-sm font-semibold text-blue-900 transition hover:text-blue-700 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <SeasonHistoryFilters
            search={historySearch}
            onSearchChange={setHistorySearch}
            type={historyType}
            onTypeChange={setHistoryType}
            year={historyYear}
            onYearChange={setHistoryYear}
            years={historyYears}
            resultCount={filteredRecords.length}
            totalCount={records.length}
          />

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Loading planting records...
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mb-3 text-4xl">🌾</div>

              <h3 className="font-semibold text-slate-800">
                No planting records yet
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Click Add Planting Record to create your first record.
              </p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No planting records match the selected search and filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-bold">Code</th>
                    <th className="px-5 py-4 font-bold">Season</th>
                    <th className="px-5 py-4 font-bold">Field</th>
                    <th className="px-5 py-4 font-bold">Crop</th>
                    <th className="px-5 py-4 font-bold">Planting Date</th>
                    <th className="px-5 py-4 font-bold">Expected Harvest</th>
                    <th className="px-5 py-4 font-bold">Yield (Tons)</th>
                    <th className="px-5 py-4 font-bold">Status</th>
                    <th className="px-5 py-4 text-right font-bold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">
                        {record.record_code || `#${record.id}`}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {record.season || "—"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {record.field_name || "—"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {record.crop || "—"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {formatDate(record.planting_date)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {formatDate(record.expected_harvest_date)}
                      </td>

                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {Number(record.harvested_yield || 0).toFixed(2)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(record.status)}`}
                        >
                          {record.status || "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(record)}
                            className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 transition hover:bg-blue-100"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(record)}
                            className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
