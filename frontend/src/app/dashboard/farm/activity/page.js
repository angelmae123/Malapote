"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../providers";
import { toast } from "react-toastify";
import { apiRequest } from "../../../../lib/api";
import SeasonHistoryFilters from "../../../../components/dashboard/SeasonHistoryFilters";
import {
  getHistoryYears,
  matchesSeasonHistory,
} from "../../../../lib/seasonHistory";

const COLORS = {
  light: "#A7EBF2",
  teal: "#54ACBF",
  blue: "#26658C",
  deep: "#023859",
  navy: "#011C40",
};

const initialForm = {
  farm_planting_harvesting_id: "",
  activity: "",
  date: "",
  notes: "",
};

function getResponseData(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.records)) return response.records;
  return [];
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

function formatArea(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return `${value} hectares`;
  }

  return `${number.toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} hectares`;
}

function getActivityCode(record) {
  return (
    record.record_code ||
    `ACT-${String(record.id).padStart(6, "0")}`
  );
}

function getPlantingCode(record) {
  return record.record_code || `PLANTING #${record.id}`;
}

function getPlantingLabel(record) {
  return [
    getPlantingCode(record),
    record.field_name || "Unnamed Field",
    record.rice_variety || "No Variety",
    record.season || "No Season",
    record.status || "No Status",
  ].join(" · ");
}

function getActivityArea(record) {
  const area =
    record.area_hectares !== null &&
    record.area_hectares !== undefined &&
    record.area_hectares !== ""
      ? record.area_hectares
      : record.area;

  return formatArea(area);
}

function getActivitySeason(record) {
  return record.planting_season || record.season || "—";
}

function getActivityVariety(record) {
  return (
    record.rice_variety ||
    record.type_of_seedling ||
    "—"
  );
}

function getStatusStyle(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "harvested") {
    return "border border-[#54ACBF]/30 bg-[#A7EBF2]/30 text-[#023859]";
  }

  if (normalized === "growing") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "planned") {
    return "border border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border border-slate-200 bg-slate-50 text-slate-600";
}

/* REUSABLE FORM FIELD */
function FormField({ label, required, htmlFor, children, hint }) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#023859]"
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children}

      {hint && (
        <p className="mt-1.5 text-[11px] text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
}

/* INPUT STYLES */
const inputClass =
  "w-full rounded-xl border border-[#54ACBF]/30 bg-[#A7EBF2]/10 px-3.5 py-2.5 text-[12px] text-[#011C40] outline-none transition placeholder:text-slate-400 focus:border-[#26658C] focus:bg-white focus:ring-2 focus:ring-[#54ACBF]/15";

/* MAIN PAGE */
export default function FarmActivity() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [activities, setActivities] = useState([]);
  const [plantingRecords, setPlantingRecords] = useState([]);
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

  const availablePlantingRecords = useMemo(
    () =>
      plantingRecords.filter((record) =>
        ["Planned", "Growing", "Harvested"].includes(
          String(record.status || "").trim()
        )
      ),
    [plantingRecords]
  );

  const selectedPlanting = useMemo(
    () =>
      plantingRecords.find(
        (record) =>
          String(record.id) ===
          String(formData.farm_planting_harvesting_id)
      ) || null,
    [plantingRecords, formData.farm_planting_harvesting_id]
  );

  const historyFilters = useMemo(
    () => ({
      search: historySearch,
      type: historyType,
      year: historyYear,
    }),
    [historySearch, historyType, historyYear]
  );

  const filteredActivities = useMemo(
    () =>
      activities.filter((record) =>
        matchesSeasonHistory(
          record,
          seasons,
          historyFilters,
          "season"
        )
      ),
    [activities, seasons, historyFilters]
  );

  const historyYears = useMemo(
    () => getHistoryYears(activities, seasons, "season"),
    [activities, seasons]
  );

  /* LOAD DATA */
  const loadData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      toast.error("Your session has expired. Please sign in again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [
        activityResponse,
        plantingResponse,
        seasonResponse,
      ] = await Promise.all([
        apiRequest("farm/activities", { token }),
        apiRequest("farm/planting-harvesting", { token }),
        apiRequest("seasons", { token }),
      ]);

      setActivities(getResponseData(activityResponse));
      setPlantingRecords(getResponseData(plantingResponse));
      setSeasons(getResponseData(seasonResponse));
    } catch (requestError) {
      const message =
        requestError.message ||
        "Unable to load farm activity records.";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadData]);

  /* FORM HANDLERS */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
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
    setShowForm(true);
  };

  const handleEdit = (record) => {
    const plantingId = record.farm_planting_harvesting_id
      ? String(record.farm_planting_harvesting_id)
      : "";

    setFormData({
      farm_planting_harvesting_id: plantingId,
      activity: record.activity ?? "",
      date: record.date ?? "",
      notes: record.notes ?? "",
    });

    setEditingId(record.id);
    setError("");
    setShowForm(true);
  };

  /* SAVE ACTIVITY */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error("Your session has expired. Please sign in again.");
      return;
    }

    if (!formData.farm_planting_harvesting_id) {
      toast.error("Please select a Planting & Harvesting record.");
      return;
    }

    if (!formData.activity.trim()) {
      toast.error("Activity is required.");
      return;
    }

    if (!selectedPlanting) {
      toast.error("Please select a valid planting record.");
      return;
    }

    const payload = {
      farm_planting_harvesting_id: Number(
        formData.farm_planting_harvesting_id
      ),
      activity: formData.activity.trim(),
      date: formData.date || null,
      notes: formData.notes.trim() || null,
    };

    setSaving(true);
    setError("");

    try {
      if (editingId !== null) {
        await apiRequest(`farm/activities/${editingId}`, {
          method: "PUT",
          token,
          body: payload,
        });

        toast.success("Farm activity updated successfully.");
      } else {
        await apiRequest("farm/activities", {
          method: "POST",
          token,
          body: payload,
        });

        toast.success("Farm activity added successfully.");
      }

      resetForm();
      await loadData();
    } catch (requestError) {
      const message =
        requestError.message ||
        "Unable to save the farm activity.";

      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  /* DELETE ACTIVITY */
  const handleDelete = async (record) => {
    if (!token) {
      toast.error("Your session has expired. Please sign in again.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${getActivityCode(record)}?`
    );

    if (!confirmed) return;

    try {
      await apiRequest(`farm/activities/${record.id}`, {
        method: "DELETE",
        token,
      });

      toast.success("Farm activity deleted successfully.");
      await loadData();
    } catch (requestError) {
      toast.error(
        requestError.message ||
          "Unable to delete the farm activity."
      );
    }
  };

  const totalActivities = activities.length;
  const filteredCount = filteredActivities.length;

  return (
    <main className="min-h-screen bg-[#F3F8FA] p-3 text-[#011C40] sm:p-5 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-5">

        {/* PAGE HEADER */}
        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

          <div>
            <p className="mb-1 text-[9px] font-extrabold tracking-[1.5px] text-[#54ACBF]">
              FARM MANAGEMENT
            </p>

            <h1 className="text-xl font-serif tracking-tight text-[#011C40] sm:text-2xl">
              Farm Activity
            </h1>

            <p className="mt-1 text-[12px] text-[#26658C]">
              Record and monitor activities linked to planting cycles.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={availablePlantingRecords.length === 0 || loading}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-[#023859] px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#011C40] disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
          >
            <span className="text-base leading-none">+</span>
            Add Farm Activity
          </button>
        </header>

        {/* SUMMARY INFORMATION */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">

          <div className="flex items-center gap-3 rounded-xl border border-[#54ACBF]/25 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A7EBF2]/40 text-lg text-[#26658C]">
              ✳
            </div>

            <div>
              <p className="text-[11px] font-medium text-[#26658C]">
                Total Activities
              </p>

              <p className="mt-0.5 text-xl font-bold text-[#011C40]">
                {loading ? "..." : totalActivities}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-[#54ACBF]/25 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A7EBF2]/40 text-lg text-[#26658C]">
              🌾
            </div>

            <div>
              <p className="text-[11px] font-medium text-[#26658C]">
                Available Planting Records
              </p>

              <p className="mt-0.5 text-xl font-bold text-[#011C40]">
                {loading ? "..." : availablePlantingRecords.length}
              </p>
            </div>
          </div>

        </section>

        {/* ERROR MESSAGE */}
        {error && !showForm && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700"
          >
            {error}
          </div>
        )}

        {/* ADD / EDIT MODAL */}
        {showForm && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#011C40]/60 p-3 backdrop-blur-sm sm:p-5"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !saving) {
                resetForm();
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="farm-activity-modal-title"
              className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#54ACBF]/30 bg-white shadow-2xl"
            >

              {/* MODAL HEADER */}
              <div className="flex items-center justify-between gap-4 border-b border-[#A7EBF2]/60 px-5 py-4 sm:px-6">

                <div>
                  <p className="mb-1 text-[9px] font-extrabold tracking-[1.3px] text-[#54ACBF]">
                    FARM MANAGEMENT
                  </p>

                  <h2
                    id="farm-activity-modal-title"
                    className="text-lg font-bold text-[#011C40]"
                  >
                    {editingId !== null
                      ? "Edit Farm Activity"
                      : "Add Farm Activity"}
                  </h2>

                  <p className="mt-1 text-[11px] text-[#26658C]">
                    Enter the details of the farm activity.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  aria-label="Close modal"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#A7EBF2]/30 text-xl text-[#26658C] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  ×
                </button>
              </div>

              {/* MODAL FORM */}
              <form
                onSubmit={handleSubmit}
                className="flex min-h-0 flex-1 flex-col"
              >

                <div className="overflow-y-auto px-5 py-5 sm:px-6">

                  {error && (
                    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">

                    {/* PLANTING RECORD */}
                    <FormField
                      label="Planting & Harvesting Record"
                      required
                      htmlFor="farm_planting_harvesting_id"
                    >
                      <select
                        id="farm_planting_harvesting_id"
                        name="farm_planting_harvesting_id"
                        value={formData.farm_planting_harvesting_id}
                        onChange={handleChange}
                        required
                        className={inputClass}
                      >
                        <option value="">
                          Select planting record
                        </option>

                        {availablePlantingRecords.map((record) => (
                          <option key={record.id} value={record.id}>
                            {getPlantingLabel(record)}
                          </option>
                        ))}
                      </select>

                      {availablePlantingRecords.length === 0 && (
                        <p className="mt-2 text-[11px] text-amber-700">
                          No eligible planting records found. Create a
                          Planned, Growing, or Harvested planting record
                          first.
                        </p>
                      )}
                    </FormField>

                    {/* SELECTED PLANTING DETAILS */}
                    {selectedPlanting && (
                      <div className="rounded-xl border border-[#54ACBF]/25 bg-[#A7EBF2]/15 p-4">

                        <div className="mb-3 flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#A7EBF2]/60 text-sm text-[#26658C]">
                            🌾
                          </span>

                          <p className="text-[11px] font-bold uppercase tracking-wider text-[#023859]">
                            Selected Planting Information
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                          <div>
                            <p className="text-[10px] text-[#26658C]">
                              Record Code
                            </p>
                            <p className="mt-0.5 text-[12px] font-semibold text-[#011C40]">
                              {getPlantingCode(selectedPlanting)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] text-[#26658C]">
                              Field
                            </p>
                            <p className="mt-0.5 text-[12px] font-semibold text-[#011C40]">
                              {selectedPlanting.field_name || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] text-[#26658C]">
                              Season
                            </p>
                            <p className="mt-0.5 text-[12px] font-semibold text-[#011C40]">
                              {selectedPlanting.season || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] text-[#26658C]">
                              Area
                            </p>
                            <p className="mt-0.5 text-[12px] font-semibold text-[#011C40]">
                              {formatArea(selectedPlanting.area_hectares)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] text-[#26658C]">
                              Rice Variety
                            </p>
                            <p className="mt-0.5 text-[12px] font-semibold text-[#011C40]">
                              {selectedPlanting.rice_variety || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] text-[#26658C]">
                              Planting Status
                            </p>

                            <span
                              className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${getStatusStyle(selectedPlanting.status)}`}
                            >
                              {selectedPlanting.status || "—"}
                            </span>
                          </div>

                        </div>

                        <p className="mt-3 border-t border-[#54ACBF]/20 pt-2 text-[10px] text-[#26658C]">
                          These details are automatically taken from the
                          selected planting record.
                        </p>
                      </div>
                    )}

                    {/* ACTIVITY */}
                    <FormField
                      label="Farm Activity"
                      required
                      htmlFor="activity"
                      hint="Example: Land Preparation, Transplanting, Irrigation"
                    >
                      <input
                        id="activity"
                        type="text"
                        name="activity"
                        value={formData.activity}
                        onChange={handleChange}
                        maxLength={100}
                        required
                        placeholder="Enter farm activity"
                        className={inputClass}
                      />
                    </FormField>

                    {/* DATE */}
                    <FormField
                      label="Activity Date"
                      htmlFor="date"
                      hint="Optional. Leave blank if the date is not yet available."
                    >
                      <input
                        id="date"
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </FormField>

                    {/* NOTES */}
                    <FormField
                      label="Notes"
                      htmlFor="notes"
                      hint="Additional information about this farm activity."
                    >
                      <textarea
                        id="notes"
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows={3}
                        maxLength={10000}
                        placeholder="Enter additional details..."
                        className={`${inputClass} resize-y`}
                      />
                    </FormField>

                  </div>
                </div>

                {/* MODAL FOOTER */}
                <div className="flex flex-col-reverse gap-2 border-t border-[#A7EBF2]/50 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">

                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={saving}
                    className="rounded-xl border border-[#54ACBF]/40 px-5 py-2.5 text-[12px] font-semibold text-[#26658C] transition hover:bg-[#A7EBF2]/20 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      saving ||
                      !selectedPlanting ||
                      !formData.farm_planting_harvesting_id ||
                      availablePlantingRecords.length === 0
                    }
                    className="rounded-xl bg-[#023859] px-6 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#011C40] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : editingId !== null
                        ? "Update Activity"
                        : "Save Activity"}
                  </button>

                </div>
              </form>
            </section>
          </div>
        )}

        {/* ACTIVITY RECORDS */}
        <section className="overflow-hidden rounded-2xl border border-[#54ACBF]/25 bg-white shadow-sm">

          {/* TABLE HEADER */}
          <div className="flex flex-col gap-3 border-b border-[#A7EBF2]/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">

            <div>
              <h2 className="text-base font-bold text-[#011C40]">
                Farm Activity Records
              </h2>

              <p className="mt-1 text-[11px] text-[#26658C]">
                Showing {filteredCount} of {totalActivities} records
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-[#54ACBF]/30 bg-[#A7EBF2]/20 px-3.5 py-2 text-[11px] font-semibold text-[#26658C] transition hover:bg-[#A7EBF2]/50 disabled:opacity-50 sm:self-auto"
            >
              <span className="text-sm">↻</span>
              {loading ? "Refreshing..." : "Refresh"}
            </button>

          </div>

          {/* HISTORY FILTERS */}
          <div className="border-b border-slate-100">
            <SeasonHistoryFilters
              search={historySearch}
              onSearchChange={setHistorySearch}
              type={historyType}
              onTypeChange={setHistoryType}
              year={historyYear}
              onYearChange={setHistoryYear}
              years={historyYears}
              resultCount={filteredCount}
              totalCount={totalActivities}
            />
          </div>

          {/* LOADING */}
          {loading ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#A7EBF2] border-t-[#26658C]" />
              <p className="text-[12px] text-[#26658C]">
                Loading farm activities...
              </p>
            </div>

          ) : activities.length === 0 ? (

            /* EMPTY STATE */
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#A7EBF2]/30 text-2xl">
                🌱
              </div>

              <h3 className="text-sm font-bold text-[#011C40]">
                No Farm Activities Yet
              </h3>

              <p className="mx-auto mt-1 max-w-sm text-[11px] text-[#26658C]">
                Create a planting record first, then add your farm
                activities to keep track of your farm operations.
              </p>

            </div>

          ) : filteredActivities.length === 0 ? (

            /* NO FILTER RESULTS */
            <div className="p-12 text-center">
              <div className="mb-3 text-3xl">⌕</div>

              <h3 className="text-sm font-semibold text-[#011C40]">
                No Matching Records
              </h3>

              <p className="mt-1 text-[11px] text-[#26658C]">
                No farm activity records match your current search and filters.
              </p>
            </div>

          ) : (

            /* TABLE */
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-[11px]">

                <thead className="bg-[#A7EBF2]/20 text-[10px] uppercase tracking-wider text-[#023859]">
                  <tr>
                    <th className="px-4 py-3.5 font-bold">
                      Record Code
                    </th>

                    <th className="px-4 py-3.5 font-bold">
                      Planting Record
                    </th>

                    <th className="px-4 py-3.5 font-bold">
                      Activity
                    </th>

                    <th className="px-4 py-3.5 font-bold">
                      Area
                    </th>

                    <th className="px-4 py-3.5 font-bold">
                      Season
                    </th>

                    <th className="px-4 py-3.5 font-bold">
                      Rice Variety
                    </th>

                    <th className="px-4 py-3.5 font-bold">
                      Date
                    </th>

                    <th className="px-4 py-3.5 text-right font-bold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#A7EBF2]/30">

                  {filteredActivities.map((record) => (
                    <tr
                      key={record.id}
                      className="transition hover:bg-[#A7EBF2]/10"
                    >

                      <td className="whitespace-nowrap px-4 py-3.5 font-bold text-[#26658C]">
                        {getActivityCode(record)}
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-[#023859]">
                          {record.planting_record_code ||
                            (record.farm_planting_harvesting_id
                              ? `PLANTING #${record.farm_planting_harvesting_id}`
                              : "Not linked")}
                        </p>

                        {record.field_name && (
                          <p className="mt-1 text-[10px] text-slate-400">
                            {record.field_name}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3.5 font-semibold text-[#011C40]">
                        {record.activity || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                        {getActivityArea(record)}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-flex whitespace-nowrap rounded-full border border-[#54ACBF]/25 bg-[#A7EBF2]/20 px-2.5 py-1 text-[10px] font-semibold text-[#023859]">
                          {getActivitySeason(record)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-slate-600">
                        {getActivityVariety(record)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                        {formatDate(record.date)}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex justify-end gap-1.5">

                          <button
                            type="button"
                            onClick={() => handleEdit(record)}
                            className="rounded-lg border border-[#54ACBF]/30 bg-[#A7EBF2]/20 px-3 py-1.5 text-[10px] font-semibold text-[#26658C] transition hover:bg-[#A7EBF2]/60"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(record)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[10px] font-semibold text-red-600 transition hover:bg-red-100"
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

          {/* TABLE FOOTER */}
          {!loading && filteredActivities.length > 0 && (
            <div className="border-t border-[#A7EBF2]/40 bg-[#A7EBF2]/10 px-4 py-3">
              <p className="text-[10px] text-[#26658C]">
                Displaying{" "}
                <span className="font-bold text-[#023859]">
                  {filteredCount}
                </span>{" "}
                farm activity record(s).
              </p>
            </div>
          )}

        </section>
      </div>
    </main>
  );
}
