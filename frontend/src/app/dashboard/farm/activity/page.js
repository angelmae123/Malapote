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
  return (
    record.record_code ||
    `PLANTING #${record.id}`
  );
}

function getPlantingLabel(record) {
  const code = getPlantingCode(record);
  const field = record.field_name || "Unnamed Field";
  const variety = record.rice_variety || "No Variety";
  const season = record.season || "No Season";
  const status = record.status || "No Status";

  return `${code} · ${field} · ${variety} · ${season} · ${status}`;
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

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-900">
              Farm Management
            </p>

            <h1 className="font-serif text-3xl font-semibold text-slate-900">
              Farm Activity
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Record and track activities linked to planting cycles.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={availablePlantingRecords.length === 0 || loading}
            className="rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Add Farm Activity
          </button>
        </div>

        {error && !showForm && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {showForm && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
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
              className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-widest text-blue-900">
                    Farm Management
                  </p>

                  <h2
                    id="farm-activity-modal-title"
                    className="font-serif text-xl font-semibold text-slate-900"
                  >
                    {editingId !== null
                      ? "Edit Farm Activity"
                      : "Add Farm Activity"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Select a planting record and enter the activity details.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  aria-label="Close modal"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="overflow-y-auto px-5 py-6 sm:px-7">
                  {error && (
                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <div className="space-y-5">
                    <div>
                      <label
                        htmlFor="farm_planting_harvesting_id"
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Planting & Harvesting Record
                        <span className="text-red-500"> *</span>
                      </label>

                      <select
                        id="farm_planting_harvesting_id"
                        name="farm_planting_harvesting_id"
                        value={formData.farm_planting_harvesting_id}
                        onChange={handleChange}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10"
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
                        <p className="mt-2 text-xs text-amber-700">
                          No eligible planting records found. Create a
                          Planned, Growing, or Harvested planting record
                          first.
                        </p>
                      )}
                    </div>

                    {selectedPlanting && (
                      <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-900">
                          Selected Planting Information
                        </p>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <p className="text-xs text-slate-500">
                              Record Code
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {getPlantingCode(selectedPlanting)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Field
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {selectedPlanting.field_name || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Season
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {selectedPlanting.season || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Area
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {formatArea(selectedPlanting.area_hectares)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Rice Variety
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {selectedPlanting.rice_variety || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Planting Status
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {selectedPlanting.status || "—"}
                            </p>
                          </div>
                        </div>

                        <p className="mt-3 text-xs text-blue-800">
                          These details are automatically taken from the
                          selected planting record.
                        </p>
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="activity"
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Farm Activity
                        <span className="text-red-500"> *</span>
                      </label>

                      <input
                        id="activity"
                        type="text"
                        name="activity"
                        value={formData.activity}
                        onChange={handleChange}
                        maxLength={100}
                        required
                        placeholder="e.g. Land Preparation, Transplanting, Irrigation"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="date"
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Activity Date
                      </label>

                      <input
                        id="date"
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10"
                      />
                      <p className="mt-1 text-xs text-slate-400">
                        Optional. You can leave this blank if the date is
                        not yet available.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="notes"
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Notes
                      </label>

                      <textarea
                        id="notes"
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows={3}
                        maxLength={10000}
                        placeholder="Additional details about this farm activity..."
                        className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
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
                    className="rounded-xl bg-blue-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
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

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Farm Activity Records
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Total records: {filteredActivities.length}
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
            resultCount={filteredActivities.length}
            totalCount={activities.length}
          />

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Loading farm activities...
            </div>
          ) : activities.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mb-3 text-4xl">🌱</div>

              <h3 className="font-semibold text-slate-800">
                No farm activities yet
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Create a planting record first, then add your farm
                activities.
              </p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No farm activity records match the selected search and filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-bold">
                      Record Code
                    </th>
                    <th className="px-5 py-4 font-bold">
                      Planting Record
                    </th>
                    <th className="px-5 py-4 font-bold">
                      Activity
                    </th>
                    <th className="px-5 py-4 font-bold">
                      Area
                    </th>
                    <th className="px-5 py-4 font-bold">
                      Season
                    </th>
                    <th className="px-5 py-4 font-bold">
                      Rice Variety
                    </th>
                    <th className="px-5 py-4 font-bold">
                      Date
                    </th>
                    <th className="px-5 py-4 text-right font-bold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredActivities.map((record) => (
                    <tr
                      key={record.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-blue-900">
                        {getActivityCode(record)}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {record.planting_record_code ||
                          (record.farm_planting_harvesting_id
                            ? `PLANTING #${record.farm_planting_harvesting_id}`
                            : "Not linked")}

                        {record.field_name && (
                          <p className="mt-1 text-xs text-slate-400">
                            {record.field_name}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {record.activity || "—"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {getActivityArea(record)}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                          {getActivitySeason(record)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {getActivityVariety(record)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {formatDate(record.date)}
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
