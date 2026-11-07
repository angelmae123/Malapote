
"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../providers";
import { apiRequest } from "../../../../lib/api";
import SeasonSelect from "../../../../components/dashboard/SeasonSelect";
import SeasonHistoryFilters from "../../../../components/dashboard/SeasonHistoryFilters";
import {
  getHistoryYears,
  getSeasonLabel,
  matchesSeasonHistory,
} from "../../../../lib/seasonHistory";

const initialForm = {
  farm_planting_harvesting_id: "",
  season: "",
  area: "",
  activity: "",
  type_of_seedling: "",
  fertilizers: "",
  antipesticide: "",
  date: "",
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

export default function FarmActivity() {
  const { session } = useAuth();

  const [activities, setActivities] = useState([]);
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

  const historyFilters = {
    search: historySearch,
    type: historyType,
    year: historyYear,
  };

  const filteredActivities = activities.filter((record) =>
    matchesSeasonHistory(record, seasons, historyFilters, "season")
  );

  const historyYears = getHistoryYears(activities, seasons, "season");

  const loadData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError("Your session has expired. Please sign in again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [activityResponse, seasonResponse] = await Promise.all([
        apiRequest("farm/activities", { token }),
        apiRequest("seasons", { token }),
      ]);

      setActivities(getResponseData(activityResponse));
      setSeasons(getResponseData(seasonResponse));
    } catch (requestError) {
      setError(
        requestError.message || "Unable to load farm activity records."
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
      farm_planting_harvesting_id:
        record.farm_planting_harvesting_id ?? "",
      season: record.season ?? "",
      area: record.area ?? "",
      activity: record.activity ?? "",
      type_of_seedling: record.type_of_seedling ?? "",
      fertilizers: record.fertilizers ?? "",
      antipesticide: record.antipesticide ?? "",
      date: record.date ?? "",
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

    if (!formData.season) {
      setError("Please select a season.");
      return;
    }

    if (!formData.area.trim() || !formData.activity.trim()) {
      setError("Please complete the required fields.");
      return;
    }

    const payload = {
      farm_planting_harvesting_id:
        formData.farm_planting_harvesting_id === ""
          ? null
          : Number(formData.farm_planting_harvesting_id),
      season: formData.season,
      area: formData.area.trim(),
      activity: formData.activity.trim(),
      type_of_seedling: formData.type_of_seedling.trim(),
      fertilizers: formData.fertilizers.trim(),
      antipesticide: formData.antipesticide.trim(),
      date: formData.date || null,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await apiRequest(`farm/activities/${editingId}`, {
          method: "PUT",
          token,
          body: payload,
        });

        setSuccess("Farm activity updated successfully.");
      } else {
        await apiRequest("farm/activities", {
          method: "POST",
          token,
          body: payload,
        });

        setSuccess("Farm activity added successfully.");
      }

      resetForm();
      await loadData();
    } catch (requestError) {
      setError(
        requestError.message || "Unable to save the farm activity."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this farm activity?"
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await apiRequest(`farm/activities/${record.id}`, {
        method: "DELETE",
        token,
      });

      setSuccess("Farm activity deleted successfully.");
      await loadData();
    } catch (requestError) {
      setError(
        requestError.message || "Unable to delete the farm activity."
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
              Farm Activity
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Record and track your farm activities.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className="rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:bg-blue-800"
          >
            + Add Farm Activity
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
              {/* Modal Header */}
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
                    Enter the details of the farm activity.
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

              {/* Modal Form */}
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

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                    {/* Planting Record ID */}
                    <div>
                      <label
                        htmlFor="farm_planting_harvesting_id"
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Planting Record ID
                      </label>

                      <input
                        id="farm_planting_harvesting_id"
                        type="number"
                        min="1"
                        step="1"
                        name="farm_planting_harvesting_id"
                        value={formData.farm_planting_harvesting_id}
                        onChange={handleChange}
                        placeholder="Enter planting record ID"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10"
                      />
                    </div>

                    {/* Season */}
                    <div>
                      <label
                        htmlFor="season"
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Season <span className="text-red-500">*</span>
                      </label>

                      <SeasonSelect
                        id="season"
                        name="season"
                        value={formData.season}
                        seasons={seasons}
                        valueField="label"
                        onChange={handleChange}
                      />

                      {seasons.length === 0 && (
                        <p className="mt-2 text-xs text-amber-700">
                          No season records available. Please check the seasons table.
                        </p>
                      )}
                    </div>

                    {/* Area */}
                    <div>
                      <label
                        htmlFor="area"
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Area / Field <span className="text-red-500">*</span>
                      </label>

                      <input
                        id="area"
                        type="text"
                        name="area"
                        value={formData.area}
                        onChange={handleChange}
                        required
                        placeholder="Enter area or field"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10"
                      />
                    </div>

                    {/* Activity */}
                    <div>
                      <label
                        htmlFor="activity"
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Activity <span className="text-red-500">*</span>
                      </label>

                      <input
                        id="activity"
                        type="text"
                        name="activity"
                        value={formData.activity}
                        onChange={handleChange}
                        required
                        placeholder="e.g. Land preparation"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10"
                      />
                    </div>

                    {/* Seedling */}
                    <div>
                      <label
                        htmlFor="type_of_seedling"
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Type of Seedling
                      </label>

                      <input
                        id="type_of_seedling"
                        type="text"
                        name="type_of_seedling"
                        value={formData.type_of_seedling}
                        onChange={handleChange}
                        placeholder="Enter seedling type"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10"
                      />
                    </div>

                    {/* Fertilizers */}
                    <div>
                      <label
                        htmlFor="fertilizers"
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Fertilizers
                      </label>

                      <input
                        id="fertilizers"
                        type="text"
                        name="fertilizers"
                        value={formData.fertilizers}
                        onChange={handleChange}
                        placeholder="Enter fertilizers used"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10"
                      />
                    </div>

                    {/* Pesticide */}
                    <div>
                      <label
                        htmlFor="antipesticide"
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Pesticide / Treatment
                      </label>

                      <input
                        id="antipesticide"
                        type="text"
                        name="antipesticide"
                        value={formData.antipesticide}
                        onChange={handleChange}
                        placeholder="Enter pesticide or treatment"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10"
                      />
                    </div>

                    {/* Date */}
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
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
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
                    disabled={saving || seasons.length === 0}
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

        {/* Activity Table */}
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
                Click Add Farm Activity to create your first record.
              </p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No farm activity records match the selected search and filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-bold">Date</th>
                    <th className="px-5 py-4 font-bold">Activity</th>
                    <th className="px-5 py-4 font-bold">Area / Field</th>
                    <th className="px-5 py-4 font-bold">Season</th>
                    <th className="px-5 py-4 font-bold">Fertilizer</th>
                    <th className="px-5 py-4 font-bold">Seedling</th>
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
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {formatDate(record.date)}
                      </td>

                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {record.activity || "—"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {record.area || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                          {getSeasonLabel(null, record.season) || "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {record.fertilizers || "—"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {record.type_of_seedling || "—"}
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
