"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../providers";
import { apiRequest } from "../../../../lib/api";
import { toast } from "react-toastify";
import SeasonHistoryFilters from "../../../../components/dashboard/SeasonHistoryFilters";
import {
  getHistoryYears,
  matchesSeasonHistory,
} from "../../../../lib/seasonHistory";

const initialForm = {
  record_code: "",
  season: "",
  field_name: "",
  area_hectares: "",
  crop: "Palay",
  rice_variety: "",
  method: "",
  planting_date: "",
  expected_harvest_date: "",
  actual_harvest_date: "",
  harvested_yield: "0",
  status: "Planned",
};

// FIX: Added missing inputClass definition.
const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-900 focus:bg-white focus:ring-2 focus:ring-blue-100";

// Generate a code according to the current planting/harvesting status.
// Planned and Growing records use PLANTING; Harvested records use HARVESTING.
const getRecordCodePrefix = (status) =>
  status === "Harvested" ? "HARVESTING" : "PLANTING";

const generateRecordCode = (status) =>
  `${getRecordCodePrefix(status)}-${new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14)}`;

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

function formatDate(date) {
  if (!date) return "—";

  const dateValue = String(date).slice(0, 10);
  const parsedDate = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) return date;

  return parsedDate.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatNumber(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) return "0";

  return number.toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function getSeasonForDate(seasons, date) {
  if (!date) return null;

  return (
    seasons.find((season) => {
      const startDate = String(season.start_date || "").slice(0, 10);
      const endDate = String(season.end_date || "").slice(0, 10);

      return (
        startDate &&
        endDate &&
        date >= startDate &&
        date <= endDate
      );
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

  return seasonYear
    ? `${seasonLabel} ${seasonYear}`
    : seasonLabel;
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

function FormField({ label, required, children }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children}
    </div>
  );
}

export default function PlantingHarvesting() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [records, setRecords] = useState([]);
  const [seasons, setSeasons] = useState([]);

  const [historySearch, setHistorySearch] = useState("");
  const [historyType, setHistoryType] = useState("all");
  const [historyYear, setHistoryYear] = useState("all");

  const [formData, setFormData] = useState({ ...initialForm });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    matchesSeasonHistory(
      record,
      seasons,
      historyFilters,
      "season"
    )
  );

  const historyYears = getHistoryYears(
    records,
    seasons,
    "season"
  );

  const loadData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      toast.error("Your session has expired. Please sign in again.");
      return;
    }

    setLoading(true);

    try {
      const [recordResponse, seasonResponse] = await Promise.all([
        apiRequest("farm/planting-harvesting", { token }),
        apiRequest("seasons", { token }),
      ]);

      setRecords(getResponseData(recordResponse));
      setSeasons(getResponseData(seasonResponse));
    } catch (requestError) {
      toast.error(
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

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => {
      const updated = {
        ...previous,
        [name]: value,
      };

      if (name === "planting_date") {
        updated.season = getSeasonLabel(
          getSeasonForDate(seasons, value),
          value
        );
      }

      if (name === "status") {
        // Change the code prefix when the record changes between
        // a planting record (Planned/Growing) and a harvesting record.
        if (previous.status !== value) {
          updated.record_code = generateRecordCode(value);
        }

        if (value !== "Harvested") {
          updated.actual_harvest_date = "";
          updated.harvested_yield = "0";
        }
      }

      return updated;
    });
  };

  const resetForm = () => {
    setFormData({ ...initialForm });
    setEditingId(null);
    setShowForm(false);
  };

  const handleAdd = () => {
    const newForm = { ...initialForm };
    newForm.record_code = generateRecordCode(newForm.status);

    setFormData(newForm);
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (record) => {
    const expectedPrefix = getRecordCodePrefix(record.status);
    const currentCode = String(record.record_code || "");
    const currentPrefix = currentCode.split("-")[0];
    const recordCode =
      currentCode && currentPrefix === expectedPrefix
        ? currentCode
        : generateRecordCode(record.status);

    setFormData({
      record_code: recordCode,
      season: record.season ?? "",
      field_name: record.field_name ?? "",

      area_hectares:
        record.area_hectares !== null &&
        record.area_hectares !== undefined
          ? String(record.area_hectares)
          : "",

      crop: record.crop ?? "Palay",
      rice_variety: record.rice_variety ?? "",
      method: record.method ?? "",

      planting_date: String(
        record.planting_date || ""
      ).slice(0, 10),

      expected_harvest_date: String(
        record.expected_harvest_date || ""
      ).slice(0, 10),

      actual_harvest_date: String(
        record.actual_harvest_date || ""
      ).slice(0, 10),

      harvested_yield: String(
        record.harvested_yield ?? "0"
      ),

      status: record.status ?? "Planned",
    });

    setEditingId(record.id);
    setShowForm(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      toast.error("Your session has expired. Please sign in again.");
      return;
    }

    if (!formData.planting_date) {
      toast.error("Please select a planting date.");
      return;
    }

    if (!selectedSeason) {
      toast.error(
        "No season covers the selected planting date. Check the season date ranges in your database."
      );
      return;
    }

    if (!formData.field_name.trim()) {
      toast.error("Please enter the field name.");
      return;
    }

    const area = Number(formData.area_hectares);

    if (!Number.isFinite(area) || area <= 0) {
      toast.error(
        "Please enter a valid area greater than zero hectares."
      );
      return;
    }

    if (!formData.crop.trim()) {
      toast.error("Please enter the crop.");
      return;
    }

    if (!formData.rice_variety.trim()) {
      toast.error("Please enter the rice variety.");
      return;
    }

    if (!formData.status) {
      toast.error("Please select a planting status.");
      return;
    }

    const harvestedYield = Number(formData.harvested_yield);

    if (
      !Number.isFinite(harvestedYield) ||
      harvestedYield < 0
    ) {
      toast.error("Please enter a valid harvested yield.");
      return;
    }

    if (
      formData.expected_harvest_date &&
      formData.expected_harvest_date < formData.planting_date
    ) {
      toast.error(
        "Expected harvest date cannot be earlier than planting date."
      );
      return;
    }

    if (
      formData.actual_harvest_date &&
      formData.actual_harvest_date < formData.planting_date
    ) {
      toast.error(
        "Actual harvest date cannot be earlier than planting date."
      );
      return;
    }

    if (
      formData.status === "Harvested" &&
      !formData.actual_harvest_date
    ) {
      toast.error(
        "Please enter the actual harvest date for harvested records."
      );
      return;
    }

    if (
      formData.status === "Harvested" &&
      harvestedYield <= 0
    ) {
      toast.error(
        "Harvested yield must be greater than zero."
      );
      return;
    }

    const payload = {
      record_code: formData.record_code.trim(),

      season: getSeasonLabel(
        selectedSeason,
        formData.planting_date
      ),

      field_name: formData.field_name.trim(),
      area_hectares: area,
      crop: formData.crop.trim(),
      rice_variety: formData.rice_variety.trim(),
      method: formData.method.trim(),

      planting_date: formData.planting_date,

      expected_harvest_date:
        formData.expected_harvest_date || null,

      actual_harvest_date:
        formData.status === "Harvested"
          ? formData.actual_harvest_date
          : null,

      harvested_yield:
        formData.status === "Harvested"
          ? harvestedYield
          : 0,

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

        toast.success(
          "Planting and harvesting record updated successfully."
        );
      } else {
        await apiRequest("farm/planting-harvesting", {
          method: "POST",
          token,
          body: payload,
        });

        toast.success(
          "Planting and harvesting record added successfully."
        );
      }

      resetForm();
      await loadData();
    } catch (requestError) {
      toast.error(
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

    if (!token) {
      toast.error("Your session has expired. Please sign in again.");
      return;
    }

    try {
      await apiRequest(
        `farm/planting-harvesting/${record.id}`,
        {
          method: "DELETE",
          token,
        }
      );

      toast.success(
        "Planting and harvesting record deleted successfully."
      );

      await loadData();
    } catch (requestError) {
      toast.error(
        requestError.message ||
          "Unable to delete the planting and harvesting record."
      );
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* PAGE HEADER */}
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

        {/* DATA COLLECTION INFORMATION */}
        <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <div className="flex items-start gap-3">
            <div className="text-xl">🌾</div>

            <div>
              <h2 className="text-sm font-semibold text-blue-900">
                Planting and Harvest Data
              </h2>

              <p className="mt-1 text-sm leading-relaxed text-blue-800">
                Record the planted area, rice variety, planting date,
                and actual harvest results. These records will help
                build historical data for future harvest prediction.
              </p>
            </div>
          </div>
        </section>

        {/* ADD / EDIT MODAL */}
        {showForm && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget &&
                !saving
              ) {
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
              {/* MODAL HEADER */}
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

              {/* MODAL BODY */}
              <div className="overflow-y-auto px-5 py-6 sm:px-7">
                <form
                  id="planting-form"
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >
                  {/* PLANTING INFORMATION */}
                  <div>
                    <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-blue-900">
                      Planting Information
                    </h3>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                      <FormField label="Record Code">
                        <input
                          type="text"
                          name="record_code"
                          value={formData.record_code}
                          placeholder="Automatically generated"
                          maxLength={50}
                          disabled
                          className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500`}
                        />
                        <p className="mt-2 text-xs text-slate-400">
                          Automatically generated: PLANTING for Planned/Growing
                          and HARVESTING for Harvested records.
                        </p>
                      </FormField>

                      <FormField label="Season (Automatic)">
                        <output
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
                              : "Select planting date first"}
                        </output>

                        {seasons.length === 0 && (
                          <p className="mt-2 text-xs text-amber-700">
                            No season records were returned. Check your
                            seasons database and API.
                          </p>
                        )}
                      </FormField>

                      <FormField label="Field Name" required>
                        <input
                          type="text"
                          name="field_name"
                          value={formData.field_name}
                          onChange={handleChange}
                          required
                          maxLength={100}
                          placeholder="e.g. Field A"
                          className={inputClass}
                        />
                      </FormField>

                      <FormField label="Area (Hectares)" required>
                        <input
                          type="number"
                          name="area_hectares"
                          value={formData.area_hectares}
                          onChange={handleChange}
                          min="0.01"
                          max="99999999.99"
                          step="0.01"
                          required
                          placeholder="e.g. 2.50"
                          className={inputClass}
                        />

                        <p className="mt-2 text-xs text-slate-400">
                          Enter the actual planted area in hectares.
                        </p>
                      </FormField>

                      <FormField label="Crop" required>
                        <input
                          type="text"
                          name="crop"
                          value={formData.crop}
                          onChange={handleChange}
                          required
                          maxLength={100}
                          placeholder="e.g. Palay"
                          className={inputClass}
                        />
                      </FormField>

                      <FormField label="Rice Variety" required>
                        <input
                          type="text"
                          name="rice_variety"
                          value={formData.rice_variety}
                          onChange={handleChange}
                          required
                          maxLength={100}
                          placeholder="e.g. NSIC Rc 222"
                          className={inputClass}
                        />

                        <p className="mt-2 text-xs text-slate-400">
                          Enter the exact rice variety planted in this field.
                        </p>
                      </FormField>

                      <FormField label="Planting Method">
                        <input
                          type="text"
                          name="method"
                          value={formData.method}
                          onChange={handleChange}
                          maxLength={50}
                          placeholder="e.g. Direct seeding, Transplanting"
                          className={inputClass}
                        />
                      </FormField>

                      <FormField label="Planting Date" required>
                        <input
                          type="date"
                          name="planting_date"
                          value={formData.planting_date}
                          onChange={handleChange}
                          required
                          className={inputClass}
                        />
                      </FormField>

                      <FormField label="Expected Harvest Date">
                        <input
                          type="date"
                          name="expected_harvest_date"
                          value={formData.expected_harvest_date}
                          onChange={handleChange}
                          min={formData.planting_date || undefined}
                          className={inputClass}
                        />
                      </FormField>

                      <FormField label="Status" required>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleChange}
                          required
                          className={inputClass}
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
                      </FormField>
                    </div>
                  </div>

                  {/* HARVEST INFORMATION */}
                  {formData.status === "Harvested" ? (
                    <div className="rounded-2xl border border-green-200 bg-green-50/50 p-5">
                      <div className="mb-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-green-800">
                          Actual Harvest Information
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          Enter the actual harvest date and final
                          harvested yield.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <FormField label="Actual Harvest Date" required>
                          <input
                            type="date"
                            name="actual_harvest_date"
                            value={formData.actual_harvest_date}
                            onChange={handleChange}
                            min={formData.planting_date || undefined}
                            required
                            className={inputClass}
                          />
                        </FormField>

                        <FormField label="Harvested Yield (Tons)" required>
                          <input
                            type="number"
                            name="harvested_yield"
                            value={formData.harvested_yield}
                            onChange={handleChange}
                            min="0.01"
                            max="99999999.99"
                            step="0.01"
                            required
                            className={inputClass}
                          />
                        </FormField>
                      </div>

                      <p className="mt-4 text-xs leading-relaxed text-green-800">
                        Only actual harvest results should be recorded
                        here. These values will become part of the
                        historical production data.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-700">
                        Harvest details are not required yet.
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Actual harvest date and harvested yield can be
                        recorded when the planting status changes to
                        Harvested.
                      </p>
                    </div>
                  )}
                </form>
              </div>

              {/* MODAL FOOTER */}
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

        {/* RECORDS TABLE */}
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
              <table className="w-full min-w-[1500px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-bold">Code</th>
                    <th className="px-5 py-4 font-bold">Season</th>
                    <th className="px-5 py-4 font-bold">Field</th>
                    <th className="px-5 py-4 font-bold">Area (Ha)</th>
                    <th className="px-5 py-4 font-bold">Rice Variety</th>
                    <th className="px-5 py-4 font-bold">Planting Date</th>
                    <th className="px-5 py-4 font-bold">Expected Harvest</th>
                    <th className="px-5 py-4 font-bold">Actual Harvest</th>
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

                      <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">
                        {record.area_hectares !== null &&
                        record.area_hectares !== undefined
                          ? `${formatNumber(record.area_hectares)} ha`
                          : "—"}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">
                          {record.rice_variety || "—"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {record.crop || "Palay"}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {formatDate(record.planting_date)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {formatDate(record.expected_harvest_date)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {formatDate(record.actual_harvest_date)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">
                        {formatNumber(record.harvested_yield)}
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
