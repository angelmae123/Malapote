
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../providers";
import { apiRequest } from "../../../../lib/api";
import { toast } from "react-toastify";
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

const inputClass =
  "w-full rounded-xl border border-[#54ACBF]/30 bg-[#A7EBF2]/10 px-3.5 py-2.5 text-[12px] text-[#011C40] outline-none transition placeholder:text-slate-400 focus:border-[#26658C] focus:bg-white focus:ring-2 focus:ring-[#54ACBF]/15";

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

  return seasonYear ? `${seasonLabel} ${seasonYear}` : seasonLabel;
}

function getStatusStyle(status) {
  switch (status) {
    case "Planned":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "Growing":
      return "border-[#54ACBF]/30 bg-[#A7EBF2]/30 text-[#023859]";
    case "Harvested":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function FormField({ label, required, children, hint }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#023859]">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children}

      {hint && (
        <p className="mt-1.5 text-[11px] text-slate-400">{hint}</p>
      )}
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

  const selectedSeason = useMemo(
    () => getSeasonForDate(seasons, formData.planting_date),
    [seasons, formData.planting_date]
  );

  const historyFilters = useMemo(
    () => ({
      search: historySearch,
      type: historyType,
      year: historyYear,
    }),
    [historySearch, historyType, historyYear]
  );

  const filteredRecords = useMemo(
    () =>
      records.filter((record) =>
        matchesSeasonHistory(record, seasons, historyFilters, "season")
      ),
    [records, seasons, historyFilters]
  );

  const historyYears = useMemo(
    () => getHistoryYears(records, seasons, "season"),
    [records, seasons]
  );

  const totalHarvested = useMemo(
    () => records.filter((record) => record.status === "Harvested").length,
    [records]
  );

  const totalArea = useMemo(
    () =>
      records.reduce(
        (total, record) => total + (Number(record.area_hectares) || 0),
        0
      ),
    [records]
  );

  const totalYield = useMemo(
    () =>
      records.reduce(
        (total, record) =>
          total +
          (record.status === "Harvested"
            ? Number(record.harvested_yield) || 0
            : 0),
        0
      ),
    [records]
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
      const updated = { ...previous, [name]: value };

      if (name === "planting_date") {
        updated.season = getSeasonLabel(
          getSeasonForDate(seasons, value),
          value
        );
      }

      if (name === "status") {
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
    const newForm = {
      ...initialForm,
      record_code: generateRecordCode(initialForm.status),
    };

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
      planting_date: String(record.planting_date || "").slice(0, 10),
      expected_harvest_date: String(
        record.expected_harvest_date || ""
      ).slice(0, 10),
      actual_harvest_date: String(
        record.actual_harvest_date || ""
      ).slice(0, 10),
      harvested_yield: String(record.harvested_yield ?? "0"),
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
      toast.error("Please enter a valid area greater than zero hectares.");
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

    if (!Number.isFinite(harvestedYield) || harvestedYield < 0) {
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

    if (formData.status === "Harvested" && harvestedYield <= 0) {
      toast.error("Harvested yield must be greater than zero.");
      return;
    }

    const payload = {
      record_code: formData.record_code.trim(),
      season: getSeasonLabel(selectedSeason, formData.planting_date),
      field_name: formData.field_name.trim(),
      area_hectares: area,
      crop: formData.crop.trim(),
      rice_variety: formData.rice_variety.trim(),
      method: formData.method.trim(),
      planting_date: formData.planting_date,
      expected_harvest_date: formData.expected_harvest_date || null,
      actual_harvest_date:
        formData.status === "Harvested"
          ? formData.actual_harvest_date
          : null,
      harvested_yield:
        formData.status === "Harvested" ? harvestedYield : 0,
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
    <main className="min-h-screen bg-[#F3F8FA] p-3 text-[#011C40] sm:p-5 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-5">

        {/* PAGE HEADER */}
        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-[9px] font-extrabold tracking-[1.5px] text-[#54ACBF]">
              FARM MANAGEMENT
            </p>

            <h1 className="text-xl font-serif tracking-tight text-[#011C40] sm:text-2xl">
              Planting & Harvesting
            </h1>

            <p className="mt-1 text-[12px] text-[#26658C]">
              Track planting schedules, crop progress, and harvest results.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-[#023859] px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#011C40] disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
          >
            <span className="text-base leading-none">+</span>
            Add Planting Record
          </button>
        </header>

        {/* SUMMARY CARDS */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-3 rounded-xl border border-[#54ACBF]/25 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A7EBF2]/40 text-lg">
              🌱
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#26658C]">
                Total Records
              </p>
              <p className="mt-0.5 text-xl font-bold text-[#011C40]">
                {loading ? "..." : records.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-[#54ACBF]/25 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A7EBF2]/40 text-lg">
              🌾
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#26658C]">
                Harvested Records
              </p>
              <p className="mt-0.5 text-xl font-bold text-[#011C40]">
                {loading ? "..." : totalHarvested}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-[#54ACBF]/25 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A7EBF2]/40 text-lg">
              📐
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#26658C]">
                Total Planted Area
              </p>
              <p className="mt-0.5 text-xl font-bold text-[#011C40]">
                {loading ? "..." : `${formatNumber(totalArea)} ha`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-[#54ACBF]/25 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A7EBF2]/40 text-lg">
              📦
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#26658C]">
                Total Harvested Yield
              </p>
              <p className="mt-0.5 text-xl font-bold text-[#011C40]">
                {loading ? "..." : `${formatNumber(totalYield)} tons`}
              </p>
            </div>
          </div>
        </section>

        {/* DATA COLLECTION INFORMATION */}
        <section className="rounded-xl border border-[#54ACBF]/25 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A7EBF2]/40 text-xl">
              🌾
            </div>
            <div>
              <h2 className="text-[13px] font-bold text-[#023859]">
                Planting and Harvest Data
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-[#26658C]">
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
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#011C40]/60 p-3 backdrop-blur-sm sm:p-5"
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
              className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#54ACBF]/30 bg-white shadow-2xl"
            >
              {/* MODAL HEADER */}
              <div className="flex items-center justify-between gap-4 border-b border-[#A7EBF2]/60 px-5 py-4 sm:px-6">
                <div>
                  <p className="mb-1 text-[9px] font-extrabold tracking-[1.3px] text-[#54ACBF]">
                    FARM MANAGEMENT
                  </p>
                  <h2
                    id="planting-modal-title"
                    className="text-lg font-bold text-[#011C40]"
                  >
                    {editingId !== null
                      ? "Edit Planting Record"
                      : "Add Planting Record"}
                  </h2>
                  <p className="mt-1 text-[11px] text-[#26658C]">
                    Enter the planting and harvest information.
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

              {/* MODAL BODY */}
              <div className="overflow-y-auto px-5 py-5 sm:px-6">
                <form
                  id="planting-form"
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >
                  {/* PLANTING INFORMATION */}
                  <div>
                    <div className="mb-4 border-b border-[#A7EBF2]/50 pb-2">
                      <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-[#023859]">
                        Planting Information
                      </h3>
                      <p className="mt-1 text-[10px] text-[#26658C]">
                        Basic details about the planted field and crop.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField
                        label="Record Code"
                        hint="Automatically generated: PLANTING for Planned/Growing and HARVESTING for Harvested records."
                      >
                        <input
                          type="text"
                          name="record_code"
                          value={formData.record_code}
                          placeholder="Automatically generated"
                          maxLength={50}
                          disabled
                          className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500`}
                        />
                      </FormField>

                      <FormField label="Season (Automatic)">
                        <output
                          aria-live="polite"
                          className={`flex min-h-[40px] w-full items-center rounded-xl border px-3.5 py-2.5 text-[12px] ${
                            selectedSeason
                              ? "border-[#54ACBF]/40 bg-[#A7EBF2]/20 font-semibold text-[#023859]"
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
                          <p className="mt-1.5 text-[11px] text-amber-700">
                            No season records were returned. Check your seasons database and API.
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

                      <FormField
                        label="Area (Hectares)"
                        required
                        hint="Enter the actual planted area in hectares."
                      >
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

                      <FormField
                        label="Rice Variety"
                        required
                        hint="Enter the exact rice variety planted in this field."
                      >
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
                    <div className="rounded-xl border border-[#54ACBF]/30 bg-[#A7EBF2]/10 p-4 sm:p-5">
                      <div className="mb-4 border-b border-[#54ACBF]/20 pb-3">
                        <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-[#023859]">
                          Actual Harvest Information
                        </h3>
                        <p className="mt-1 text-[11px] text-[#26658C]">
                          Enter the actual harvest date and final harvested yield.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

                      <p className="mt-4 text-[11px] leading-relaxed text-[#26658C]">
                        Only actual harvest results should be recorded here.
                        These values will become part of the historical production data.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#54ACBF]/40 bg-[#A7EBF2]/10 p-4">
                      <p className="text-[12px] font-semibold text-[#023859]">
                        Harvest details are not required yet.
                      </p>
                      <p className="mt-1 text-[11px] text-[#26658C]">
                        Actual harvest date and harvested yield can be recorded
                        when the planting status changes to Harvested.
                      </p>
                    </div>
                  )}
                </form>
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
                  form="planting-form"
                  disabled={saving}
                  className="rounded-xl bg-[#023859] px-6 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#011C40] disabled:cursor-not-allowed disabled:opacity-50"
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
        <section className="overflow-hidden rounded-xl border border-[#54ACBF]/25 bg-white shadow-sm">
          {/* TABLE HEADER */}
          <div className="flex flex-col gap-3 border-b border-[#A7EBF2]/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-base font-bold text-[#011C40]">
                Planting & Harvesting Records
              </h2>
              <p className="mt-1 text-[11px] text-[#26658C]">
                Showing {filteredRecords.length} of {records.length} records
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
              resultCount={filteredRecords.length}
              totalCount={records.length}
            />
          </div>

          {/* LOADING */}
          {loading ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#A7EBF2] border-t-[#26658C]" />
              <p className="text-[12px] text-[#26658C]">
                Loading planting records...
              </p>
            </div>
          ) : records.length === 0 ? (
            /* EMPTY STATE */
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#A7EBF2]/30 text-2xl">
                🌾
              </div>
              <h3 className="text-sm font-bold text-[#011C40]">
                No Planting Records Yet
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-[11px] text-[#26658C]">
                Add your first planting record to start tracking crop progress and harvest results.
              </p>
            </div>
          ) : filteredRecords.length === 0 ? (
            /* NO FILTER RESULTS */
            <div className="p-12 text-center">
              <div className="mb-3 text-3xl">⌕</div>
              <h3 className="text-sm font-semibold text-[#011C40]">
                No Matching Records
              </h3>
              <p className="mt-1 text-[11px] text-[#26658C]">
                No planting records match your current search and filters.
              </p>
            </div>
          ) : (
            /* RECORDS TABLE */
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1500px] text-left text-[11px]">
                <thead className="bg-[#A7EBF2]/20 text-[10px] uppercase tracking-wider text-[#023859]">
                  <tr>
                    <th className="px-4 py-3.5 font-bold">Code</th>
                    <th className="px-4 py-3.5 font-bold">Season</th>
                    <th className="px-4 py-3.5 font-bold">Field</th>
                    <th className="px-4 py-3.5 font-bold">Area (Ha)</th>
                    <th className="px-4 py-3.5 font-bold">Rice Variety</th>
                    <th className="px-4 py-3.5 font-bold">Planting Date</th>
                    <th className="px-4 py-3.5 font-bold">Expected Harvest</th>
                    <th className="px-4 py-3.5 font-bold">Actual Harvest</th>
                    <th className="px-4 py-3.5 font-bold">Yield (Tons)</th>
                    <th className="px-4 py-3.5 font-bold">Status</th>
                    <th className="px-4 py-3.5 text-right font-bold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#A7EBF2]/30">
                  {filteredRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="transition hover:bg-[#A7EBF2]/10"
                    >
                      <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-[#023859]">
                        {record.record_code || `#${record.id}`}
                      </td>

                      <td className="px-4 py-3.5 text-slate-600">
                        {record.season || "—"}
                      </td>

                      <td className="px-4 py-3.5 text-slate-600">
                        {record.field_name || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-[#011C40]">
                        {record.area_hectares !== null &&
                        record.area_hectares !== undefined
                          ? `${formatNumber(record.area_hectares)} ha`
                          : "—"}
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-[#023859]">
                          {record.rice_variety || "—"}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-500">
                          {record.crop || "Palay"}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                        {formatDate(record.planting_date)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                        {formatDate(record.expected_harvest_date)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                        {formatDate(record.actual_harvest_date)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-[#023859]">
                        {formatNumber(record.harvested_yield)}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getStatusStyle(record.status)}`}
                        >
                          {record.status || "—"}
                        </span>
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
          {!loading && filteredRecords.length > 0 && (
            <div className="border-t border-[#A7EBF2]/40 bg-[#A7EBF2]/10 px-4 py-3">
              <p className="text-[10px] text-[#26658C]">
                Displaying{" "}
                <span className="font-bold text-[#023859]">
                  {filteredRecords.length}
                </span>{" "}
                planting and harvesting record(s).
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
