
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../providers";
import { apiRequest } from "../../../../lib/api";
import { toast } from "react-toastify";

const initialForm = {
  farm_planting_harvesting_id: "",
  farm_act_id: "",
  input_category: "NPK",
  input_name: "",
  quantity: "",
  unit: "kg",
  application_date: "",
  notes: "",
};

const categoryOptions = [
  {
    value: "NPK",
    label: "NPK Fertilizer",
    shortLabel: "NPK",
    description:
      "Complete fertilizer containing nitrogen, phosphorus, and potassium.",
  },
  {
    value: "OTHER",
    label: "Other Fertilizer",
    shortLabel: "OTHER",
    description:
      "Other fertilizer products such as urea, ammonium sulfate, and potash.",
  },
  {
    value: "PESTICIDE",
    label: "Pesticide",
    shortLabel: "PESTICIDE",
    description:
      "Products used to control insects, weeds, and crop diseases.",
  },
];

const unitOptions = {
  NPK: [{ value: "kg", label: "Kilograms (kg)" }],
  OTHER: [{ value: "kg", label: "Kilograms (kg)" }],
  PESTICIDE: [
    { value: "mL", label: "Milliliters (mL)" },
    { value: "L", label: "Liters (L)" },
  ],
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-800 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100";

function getResponseData(response) {
  let current = response;

  for (let i = 0; i < 5; i += 1) {
    if (Array.isArray(current)) return current;
    if (!current || typeof current !== "object") return [];

    if (Array.isArray(current.applications)) return current.applications;
    if (Array.isArray(current.records)) return current.records;

    if (current.data && current.data !== current) {
      current = current.data;
    } else {
      break;
    }
  }

  return [];
}

function getResponseObject(response) {
  let current = response;

  for (let i = 0; i < 5; i += 1) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return null;
    }

    if (current.totals && typeof current.totals === "object") {
      return current;
    }

    if (current.data && current.data !== current) {
      current = current.data;
    } else {
      break;
    }
  }

  return current && typeof current === "object" ? current : null;
}

function getPredictionObject(response) {
  let current = response;

  for (let i = 0; i < 5; i += 1) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return null;
    }

    if (
      current.prediction_tonnes !== undefined ||
      current.prediction_kg !== undefined
    ) {
      return current;
    }

    if (current.prediction && typeof current.prediction === "object") {
      current = current.prediction;
      continue;
    }

    if (current.data && current.data !== current) {
      current = current.data;
      continue;
    }

    break;
  }

  return null;
}

function formatNumber(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) return "0";

  return number.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
  });
}

function formatUnitTotals(items) {
  if (!Array.isArray(items) || items.length === 0) return "0";

  return items
    .map((item) => `${formatNumber(item.quantity)} ${item.unit || ""}`.trim())
    .join(" + ");
}

function formatDate(value) {
  if (!value) return "—";

  const dateValue = String(value).slice(0, 10);
  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getCategoryStyle(category) {
  switch (String(category || "").toUpperCase()) {
    case "NPK":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "OTHER":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "PESTICIDE":
      return "border-rose-200 bg-rose-50 text-rose-800";
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function getCategoryLabel(category) {
  const found = categoryOptions.find((item) => item.value === category);
  return found?.label || category || "Unknown category";
}

function getPlantingLabel(record) {
  if (!record) return "Unknown planting record";

  const code = record.record_code || `#${record.id}`;
  const field = record.field_name || "Unnamed Field";
  const variety = record.rice_variety || record.crop || "Palay";
  const season = record.season || "";

  return [code, field, variety, season].filter(Boolean).join(" • ");
}

function getPlantingDetails(record) {
  if (!record) return "Planting record details unavailable";

  const parts = [
    record.field_name || "Unnamed Field",
    record.rice_variety || record.crop || "Palay",
    record.area_hectares !== null && record.area_hectares !== undefined
      ? `${formatNumber(record.area_hectares)} ha`
      : null,
  ].filter(Boolean);

  return parts.join(" • ");
}

function getDefaultUnit(category) {
  return category === "PESTICIDE" ? "mL" : "kg";
}

function SummaryCard({ label, value, description, icon, accent }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${accent}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function FormField({ label, required, hint, children }) {
  return (
    <div className="min-w-0">
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children}

      {hint && (
        <p className="mt-2 text-xs leading-relaxed text-slate-400">{hint}</p>
      )}
    </div>
  );
}

export default function FarmInputApplications() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [applications, setApplications] = useState([]);
  const [plantingRecords, setPlantingRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [cycleTotals, setCycleTotals] = useState(null);
  const [loadingTotals, setLoadingTotals] = useState(false);
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ ...initialForm });

  // Palay prediction states
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [showPredictionPanel, setShowPredictionPanel] = useState(true);

  const plantingMap = useMemo(
    () => new Map(plantingRecords.map((record) => [String(record.id), record])),
    [plantingRecords]
  );

  const selectedPlantingCycle = plantingMap.get(String(selectedCycleId));

  const summary = useMemo(
    () => ({
      total: applications.length,
      npk: applications.filter(
        (item) => String(item.input_category || "").toUpperCase() === "NPK"
      ).length,
      other: applications.filter(
        (item) => String(item.input_category || "").toUpperCase() === "OTHER"
      ).length,
      pesticide: applications.filter(
        (item) =>
          String(item.input_category || "").toUpperCase() === "PESTICIDE"
      ).length,
    }),
    [applications]
  );

  const filteredApplications = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return [...applications]
      .filter((application) => {
        const category = String(
          application.input_category || ""
        ).toUpperCase();

        const planting = plantingMap.get(
          String(application.farm_planting_harvesting_id)
        );

        const matchesCategory =
          categoryFilter === "all" || category === categoryFilter;

        const searchableText = [
          application.record_code,
          application.input_name,
          application.input_category,
          application.unit,
          application.notes,
          application.farm_act_id,
          getPlantingLabel(planting),
          getPlantingDetails(planting),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return matchesCategory && (!keyword || searchableText.includes(keyword));
      })
      .sort((a, b) =>
        String(b.application_date || "").localeCompare(
          String(a.application_date || "")
        )
      );
  }, [applications, search, categoryFilter, plantingMap]);

  // Totals for the currently selected planting cycle.
  const cycleCategoryTotals = cycleTotals?.totals || {};

  const npkUnitTotals = cycleCategoryTotals.NPK || [];
  const otherUnitTotals = cycleCategoryTotals.OTHER || [];
  const pesticideUnitTotals = cycleCategoryTotals.PESTICIDE || [];

  const hasCycleInputRecords = [
    npkUnitTotals,
    otherUnitTotals,
    pesticideUnitTotals,
  ].some((items) => Array.isArray(items) && items.length > 0);

  // Fertilizer totals are displayed and measured in kilograms.
  // These are not sent directly from the frontend as trusted ML values.
  // The backend must retrieve the same totals from the database.
  const npkKg = Number(
    npkUnitTotals
      .filter((item) => String(item.unit).toLowerCase() === "kg")
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  );

  const otherKg = Number(
    otherUnitTotals
      .filter((item) => String(item.unit).toLowerCase() === "kg")
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  );

  const currentUnitOptions = unitOptions[formData.input_category] || [];

  const isCurrentUnitAllowed = currentUnitOptions.some(
    (option) => option.value === formData.unit
  );

  const selectedCategory = categoryOptions.find(
    (option) => option.value === formData.input_category
  );

  // Clear previous prediction whenever the selected cycle changes.
  useEffect(() => {
    setPredictionResult(null);
  }, [selectedCycleId]);

  const loadData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      toast.error("Your session has expired. Please sign in again.");
      return;
    }

    setLoading(true);

    try {
      const [applicationResponse, plantingResponse] = await Promise.all([
        apiRequest("farm/input-applications", { token }),
        apiRequest("farm/planting-harvesting", { token }),
      ]);

      const nextApplications = getResponseData(applicationResponse);
      const nextPlantingRecords = getResponseData(plantingResponse);

      setApplications(nextApplications);
      setPlantingRecords(nextPlantingRecords);

      setSelectedCycleId((current) => {
        const currentStillExists = nextPlantingRecords.some(
          (record) => String(record.id) === String(current)
        );

        if (current && currentStillExists) return current;

        return nextPlantingRecords.length
          ? String(nextPlantingRecords[0].id)
          : "";
      });
    } catch (requestError) {
      toast.error(
        requestError.message || "Unable to load farm input applications."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadCycleTotals = useCallback(async () => {
    if (!token || !selectedCycleId) {
      setCycleTotals(null);
      setLoadingTotals(false);
      return;
    }

    setLoadingTotals(true);

    try {
      const response = await apiRequest(
        `farm/input-applications/totals/${selectedCycleId}`,
        { token }
      );

      const result = getResponseObject(response);

      if (!result || !result.totals) {
        throw new Error("The server did not return input application totals.");
      }

      setCycleTotals(result);
    } catch (requestError) {
      setCycleTotals(null);
      toast.error(
        requestError.message ||
          "Unable to load input totals for the selected planting cycle."
      );
    } finally {
      setLoadingTotals(false);
    }
  }, [token, selectedCycleId]);

  useEffect(() => {
    loadCycleTotals();
  }, [loadCycleTotals, summaryRefreshKey]);

  const resetForm = () => {
    setFormData({ ...initialForm });
    setEditingId(null);
    setShowForm(false);
  };

  const handleRefresh = async () => {
    await loadData();
    setSummaryRefreshKey((current) => current + 1);
  };

  const handleAdd = () => {
    if (plantingRecords.length === 0) {
      toast.warning("Please add a planting and harvesting record first.");
      return;
    }

    setFormData({ ...initialForm });
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (application) => {
    setFormData({
      farm_planting_harvesting_id: String(
        application.farm_planting_harvesting_id ?? ""
      ),
      farm_act_id: application.farm_act_id
        ? String(application.farm_act_id)
        : "",
      input_category: String(application.input_category || "NPK").toUpperCase(),
      input_name: application.input_name || "",
      quantity: String(application.quantity ?? ""),
      unit: application.unit || getDefaultUnit(application.input_category),
      application_date: String(application.application_date || "").slice(0, 10),
      notes: application.notes || "",
    });

    setEditingId(application.id);
    setShowForm(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => {
      if (name === "input_category") {
        return {
          ...previous,
          input_category: value,
          unit: getDefaultUnit(value),
        };
      }

      return { ...previous, [name]: value };
    });
  };

  // One-click prediction: send only the selected planting cycle ID.
  const handlePredict = async () => {
    if (!token) {
      toast.error("Your session has expired. Please sign in again.");
      return;
    }

    if (!selectedCycleId || !selectedPlantingCycle) {
      toast.warning("Please select a planting cycle first.");
      return;
    }

    if (loadingTotals || !cycleTotals) {
      toast.warning(
        "Please wait until the selected planting cycle's input totals are loaded."
      );
      return;
    }

    const plantingCycleId = Number(selectedCycleId);

    if (!Number.isInteger(plantingCycleId) || plantingCycleId <= 0) {
      toast.error("Please select a valid planting cycle.");
      return;
    }

    setPredictionLoading(true);
    setPredictionResult(null);

    try {
      const response = await apiRequest("farm/palay-prediction", {
        method: "POST",
        token,
        body: {
          farm_planting_harvesting_id: plantingCycleId,
        },
      });

      const result = getPredictionObject(response);

      if (!result) {
        throw new Error(
          response?.message ||
            "The server did not return a valid palay prediction."
        );
      }

      setPredictionResult(result);
      toast.success("Palay production prediction completed.");
    } catch (requestError) {
      toast.error(
        requestError.message ||
          "Unable to generate palay production prediction."
      );
    } finally {
      setPredictionLoading(false);
    }
  };

  const handleClearPrediction = () => {
    setPredictionResult(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      toast.error("Your session has expired. Please sign in again.");
      return;
    }

    const quantity = Number(formData.quantity);
    const plantingId = Number(formData.farm_planting_harvesting_id);
    const activityId = formData.farm_act_id.trim()
      ? Number(formData.farm_act_id)
      : null;

    if (!formData.farm_planting_harvesting_id) {
      toast.error("Please select a planting and harvesting record.");
      return;
    }

    if (!Number.isInteger(plantingId) || plantingId <= 0) {
      toast.error("Please select a valid planting record.");
      return;
    }

    if (!["NPK", "OTHER", "PESTICIDE"].includes(formData.input_category)) {
      toast.error("Please select a valid input category.");
      return;
    }

    if (!formData.input_name.trim()) {
      toast.error(
        formData.input_category === "PESTICIDE"
          ? "Please enter the pesticide name."
          : "Please enter the fertilizer name."
      );
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Please enter a quantity greater than zero.");
      return;
    }

    const allowedUnits = (unitOptions[formData.input_category] || []).map(
      (option) => option.value
    );

    if (!allowedUnits.includes(formData.unit)) {
      toast.error(
        formData.input_category === "PESTICIDE"
          ? "For pesticides, please select mL or L."
          : "For fertilizers, please select kg."
      );
      return;
    }

    if (!formData.application_date) {
      toast.error("Please select the application date.");
      return;
    }

    if (
      activityId !== null &&
      (!Number.isInteger(activityId) || activityId <= 0)
    ) {
      toast.error("Please enter a valid Farm Activity ID.");
      return;
    }

    const payload = {
      farm_planting_harvesting_id: plantingId,
      farm_act_id: activityId,
      input_category: formData.input_category,
      input_name: formData.input_name.trim(),
      quantity,
      unit: formData.unit,
      application_date: formData.application_date,
      notes: formData.notes.trim() || null,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await apiRequest(`farm/input-applications/${editingId}`, {
          method: "PUT",
          token,
          body: payload,
        });

        toast.success("Farm input application updated successfully.");
      } else {
        await apiRequest("farm/input-applications", {
          method: "POST",
          token,
          body: payload,
        });

        toast.success("Farm input application added successfully.");
      }

      const savedCycleId = String(payload.farm_planting_harvesting_id);

      resetForm();
      setSelectedCycleId(savedCycleId);
      setPredictionResult(null);

      await loadData();
      setSummaryRefreshKey((current) => current + 1);
    } catch (requestError) {
      toast.error(
        requestError.message || "Unable to save farm input application."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (application) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${application.input_name}" application?`
    );

    if (!confirmed) return;

    if (!token) {
      toast.error("Your session has expired. Please sign in again.");
      return;
    }

    try {
      await apiRequest(`farm/input-applications/${application.id}`, {
        method: "DELETE",
        token,
      });

      toast.success("Farm input application deleted successfully.");

      setPredictionResult(null);
      await loadData();
      setSummaryRefreshKey((current) => current + 1);
    } catch (requestError) {
      toast.error(
        requestError.message || "Unable to delete farm input application."
      );
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* PAGE HEADER */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-900">
              Farm Management
            </p>

            <h1 className="font-serif text-3xl font-semibold text-slate-900">
              Farm Input Applications
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Track fertilizer and pesticide applications and estimate
              expected palay production for each planting cycle.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="#planting-cycle-overview"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-900 transition hover:bg-blue-100"
            >
              📊 Planting Cycle Prediction
            </a>

            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/15 transition hover:bg-blue-800"
            >
              <span className="text-lg leading-none">+</span>
              Add Input Application
            </button>
          </div>
        </header>

        {/* SUMMARY CARDS */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total Applications"
            value={summary.total.toLocaleString("en-PH")}
            description="All recorded farm inputs"
            icon="🌾"
            accent="bg-slate-100"
          />

          <SummaryCard
            label="NPK Fertilizer"
            value={summary.npk.toLocaleString("en-PH")}
            description="Complete NPK fertilizer records"
            icon="🧪"
            accent="bg-blue-50"
          />

          <SummaryCard
            label="Other Fertilizers"
            value={summary.other.toLocaleString("en-PH")}
            description="Urea, potash, and other fertilizers"
            icon="🌱"
            accent="bg-amber-50"
          />

          <SummaryCard
            label="Pesticides"
            value={summary.pesticide.toLocaleString("en-PH")}
            description="Pesticide application records"
            icon="🛡️"
            accent="bg-rose-50"
          />
        </section>

        {/* CATEGORY GUIDE */}
        <section className="grid gap-3 md:grid-cols-3">
          {categoryOptions.map((category) => (
            <div
              key={category.value}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-800">
                  {category.label}
                </span>

                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide ${getCategoryStyle(category.value)}`}
                >
                  {category.shortLabel}
                </span>
              </div>

              <p className="text-xs leading-relaxed text-slate-500">
                {category.description}
              </p>
            </div>
          ))}
        </section>

        {/* PLANTING CYCLE OVERVIEW + PREDICTION */}
        <section
          id="planting-cycle-overview"
          className="scroll-mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-900">
                Planting Cycle Overview
              </p>

              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                Planting Cycle & Production Estimate
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Select a planting cycle to view its input records and estimate
                its expected palay production.
              </p>
            </div>

            <div className="w-full lg:max-w-md">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Select Planting Record
              </label>

              <select
                value={selectedCycleId}
                onChange={(event) => {
                  setSelectedCycleId(event.target.value);
                  setPredictionResult(null);
                }}
                disabled={plantingRecords.length === 0 || loading}
                className={inputClass}
              >
                <option value="">Select a planting cycle</option>

                {plantingRecords.map((record) => (
                  <option key={record.id} value={record.id}>
                    {getPlantingLabel(record)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {plantingRecords.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mb-3 text-4xl">🌱</div>

              <h3 className="font-semibold text-slate-800">
                No Planting Records Available
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Create a planting and harvesting record first before using
                the production prediction feature.
              </p>
            </div>
          ) : !selectedPlantingCycle ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Select a planting cycle to view its details.
            </div>
          ) : (
            <div className="space-y-7 p-5 sm:p-6">
              {/* SELECTED PLANTING DETAILS */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-800">
                      Selected Planting Cycle
                    </p>

                    <h3 className="mt-2 text-lg font-semibold text-slate-900">
                      {getPlantingLabel(selectedPlantingCycle)}
                    </h3>

                    <p className="mt-1 text-sm text-slate-600">
                      {getPlantingDetails(selectedPlantingCycle)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-white px-5 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Planting Area
                    </p>

                    <p className="mt-1 text-2xl font-bold text-blue-950">
                      {formatNumber(selectedPlantingCycle.area_hectares)}
                      <span className="ml-1 text-sm font-medium">ha</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* INPUT APPLICATION SUMMARY */}
              <div>
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-900">
                    Input Applications
                  </p>

                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    Applied Inputs Summary
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Accumulated input quantities for the selected planting
                    cycle.
                  </p>
                </div>

                {loadingTotals ? (
                  <div className="rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
                    Loading input totals...
                  </div>
                ) : !cycleTotals ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    Unable to retrieve input totals. Check the{" "}
                    <code className="rounded bg-white px-1.5 py-0.5">
                      farm/input-applications/totals/{"{id}"}
                    </code>{" "}
                    endpoint.
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-800">
                          NPK Fertilizer
                        </p>

                        <p className="mt-3 text-3xl font-semibold text-blue-950">
                          {formatNumber(npkKg)}
                          <span className="ml-1 text-base font-medium">kg</span>
                        </p>

                        <p className="mt-2 text-xs text-blue-700">
                          Total recorded NPK fertilizer
                        </p>
                      </div>

                      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
                          Other Fertilizers
                        </p>

                        <p className="mt-3 text-3xl font-semibold text-amber-950">
                          {formatNumber(otherKg)}
                          <span className="ml-1 text-base font-medium">kg</span>
                        </p>

                        <p className="mt-2 text-xs text-amber-700">
                          Total recorded other fertilizer products
                        </p>
                      </div>

                      <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-rose-800">
                          Pesticide Applications
                        </p>

                        <p className="mt-3 text-xl font-semibold text-rose-950">
                          {pesticideUnitTotals.length > 0
                            ? formatUnitTotals(pesticideUnitTotals)
                            : "0"}
                        </p>

                        <p className="mt-2 text-xs text-rose-700">
                          Tracked separately by measurement unit
                        </p>
                      </div>
                    </div>

                    {!hasCycleInputRecords && (
                      <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                        <p className="text-sm font-medium text-slate-700">
                          No input applications recorded yet.
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          The fertilizer totals for this cycle are currently
                          zero.
                        </p>
                      </div>
                    )}

                    <div className="mt-4 rounded-xl border border-slate-200 p-4">
                      <h4 className="text-sm font-semibold text-slate-800">
                        Quantity Breakdown
                      </h4>

                      <div className="mt-3 grid gap-4 md:grid-cols-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-blue-800">
                            NPK
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            {formatUnitTotals(npkUnitTotals)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
                            OTHER
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            {formatUnitTotals(otherUnitTotals)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-rose-800">
                            PESTICIDE
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            {formatUnitTotals(pesticideUnitTotals)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="border-t border-slate-200" />

              {/* PALAY PRODUCTION PREDICTION */}
              <div id="cycle-prediction" className="space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-blue-900">
                      Machine Learning
                    </p>

                    <h3 className="mt-1 text-lg font-semibold text-slate-900">
                      Palay Production Prediction
                    </h3>

                    <p className="mt-1 max-w-2xl text-sm text-slate-500">
                      Generate an estimated production for the selected
                      planting cycle using its planting details and recorded
                      fertilizer totals.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setShowPredictionPanel((previous) => !previous)
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-900 transition hover:bg-blue-100"
                  >
                    {showPredictionPanel ? "Hide Prediction" : "Show Prediction"}
                    <span>{showPredictionPanel ? "−" : "+"}</span>
                  </button>
                </div>

                {showPredictionPanel && (
                  <>
                    {/* MODEL NOTICE */}
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-xl">⚠️</span>

                        <div>
                          <p className="text-sm font-semibold text-amber-900">
                            Experimental Prediction Model
                          </p>

                          <p className="mt-1 text-xs leading-relaxed text-amber-800">
                            The prediction model is experimental and uses
                            historical Philippine rice data from 1990–1997.
                            Predictions for current planting cycles have not
                            yet been validated using recent farm data. Treat
                            the result as an estimate, not a guaranteed harvest
                            quantity.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* AUTOMATIC INPUT SUMMARY */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <div className="mb-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Automatic Model Inputs
                        </p>

                        <p className="mt-1 text-sm text-slate-600">
                          These values come from the selected planting cycle
                          and its recorded input applications.
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Planting Year
                          </p>
                          <p className="mt-2 text-xl font-bold text-slate-900">
                            {selectedPlantingCycle.planting_date
                              ? new Date(
                                  `${String(
                                    selectedPlantingCycle.planting_date
                                  ).slice(0, 10)}T00:00:00`
                                ).getFullYear()
                              : selectedPlantingCycle.planting_year ||
                                selectedPlantingCycle.year ||
                                "From database"}
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Planted Area
                          </p>
                          <p className="mt-2 text-xl font-bold text-slate-900">
                            {formatNumber(
                              selectedPlantingCycle.area_hectares
                            )}{" "}
                            <span className="text-sm font-medium">ha</span>
                          </p>
                        </div>

                        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                            NPK Fertilizer
                          </p>
                          <p className="mt-2 text-xl font-bold text-blue-950">
                            {formatNumber(npkKg)}{" "}
                            <span className="text-sm font-medium">kg</span>
                          </p>
                        </div>

                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                            Other Fertilizers
                          </p>
                          <p className="mt-2 text-xl font-bold text-amber-950">
                            {formatNumber(otherKg)}{" "}
                            <span className="text-sm font-medium">kg</span>
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 text-xs leading-relaxed text-slate-500">
                        Pesticide quantities are displayed separately and are
                        not included in the fertilizer kilogram totals.
                      </p>
                    </div>

                    {/* PREDICTION ACTIONS */}
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={handlePredict}
                        disabled={
                          predictionLoading ||
                          loadingTotals ||
                          !cycleTotals ||
                          !selectedCycleId
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/15 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {predictionLoading ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            Generating Prediction...
                          </>
                        ) : (
                          <>
                            <span>📊</span>
                            Predict Production
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleClearPrediction}
                        disabled={predictionLoading || !predictionResult}
                        className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Clear Result
                      </button>
                    </div>

                    {!loadingTotals && cycleTotals && (
                      <p className="text-xs text-slate-500">
                        The prediction request uses the selected planting
                        cycle ID. The backend must retrieve the planting
                        details and fertilizer totals from the database before
                        sending the features to the ML service.
                      </p>
                    )}
                  </>
                )}

                {/* PREDICTION RESULT */}
                {predictionResult && (
                  <div className="space-y-4 rounded-2xl border border-blue-100 bg-slate-50 p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-blue-900">
                          Prediction Result
                        </p>

                        <h4 className="mt-1 text-lg font-semibold text-slate-900">
                          Estimated Palay Production
                        </h4>

                        <p className="mt-1 text-xs text-slate-500">
                          {getPlantingLabel(selectedPlantingCycle)}
                        </p>
                      </div>

                      <span className="inline-flex w-fit items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                        Experimental Estimate
                      </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-800">
                          Predicted Production
                        </p>

                        <p className="mt-3 text-3xl font-bold text-blue-950">
                          {formatNumber(predictionResult.prediction_tonnes)}
                          <span className="ml-2 text-base font-medium">
                            tonnes
                          </span>
                        </p>

                        <p className="mt-2 text-xs text-blue-700">
                          Estimated palay production
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                          Equivalent Weight
                        </p>

                        <p className="mt-3 text-3xl font-bold text-slate-900">
                          {formatNumber(predictionResult.prediction_kg)}
                          <span className="ml-2 text-base font-medium">kg</span>
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                          Kilogram equivalent of predicted production
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Model Information
                      </p>

                      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-slate-400">Model</p>
                          <p className="mt-1 font-semibold text-slate-800">
                            {predictionResult.model_name ||
                              "RandomForestRegressor"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400">Target</p>
                          <p className="mt-1 font-semibold text-slate-800">
                            {predictionResult.target || "PROD"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {Array.isArray(predictionResult.warnings) &&
                      predictionResult.warnings.length > 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                          <p className="text-sm font-semibold text-amber-900">
                            Model Warnings
                          </p>

                          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-amber-800">
                            {predictionResult.warnings.map((warning, index) => (
                              <li key={`${index}-${warning}`}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                    <p className="text-xs leading-relaxed text-slate-500">
                      This prediction is associated with the selected planting
                      cycle for viewing only. It does not update actual
                      harvested yield, planting records, or input applications.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* APPLICATION RECORDS */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Input Application Records
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Showing {filteredApplications.length} of {applications.length}{" "}
                records
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search input or planting record..."
                className="min-w-0 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100 sm:w-64"
              />

              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All Categories</option>
                <option value="NPK">NPK Fertilizer</option>
                <option value="OTHER">Other Fertilizer</option>
                <option value="PESTICIDE">Pesticide</option>
              </select>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading || loadingTotals}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-blue-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading || loadingTotals ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Loading farm input applications...
            </div>
          ) : applications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mb-3 text-4xl">🌱</div>

              <h3 className="font-semibold text-slate-800">
                No input applications yet
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Add your first fertilizer or pesticide application to get
                started.
              </p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No input applications match your search or selected category.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-bold">Record Code</th>
                    <th className="px-5 py-4 font-bold">Planting Cycle</th>
                    <th className="px-5 py-4 font-bold">Category</th>
                    <th className="px-5 py-4 font-bold">Input Name</th>
                    <th className="px-5 py-4 font-bold">Applied Amount</th>
                    <th className="px-5 py-4 font-bold">Application Date</th>
                    <th className="px-5 py-4 font-bold">Farm Activity</th>
                    <th className="px-5 py-4 font-bold">Notes</th>
                    <th className="px-5 py-4 text-right font-bold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredApplications.map((application) => {
                    const planting = plantingMap.get(
                      String(application.farm_planting_harvesting_id)
                    );

                    return (
                      <tr
                        key={application.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-5 py-4 font-semibold text-blue-900">
                          {application.record_code ||
                            `INPUT-${String(application.id).padStart(6, "0")}`}
                        </td>

                        <td className="max-w-[250px] px-5 py-4">
                          <p className="font-semibold text-slate-800">
                            {planting?.record_code ||
                              `Record #${application.farm_planting_harvesting_id}`}
                          </p>

                          <p className="mt-1 truncate text-xs text-slate-500">
                            {getPlantingDetails(planting)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${getCategoryStyle(application.input_category)}`}
                          >
                            {getCategoryLabel(
                              String(application.input_category || "").toUpperCase()
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-semibold text-slate-800">
                          {application.input_name || "—"}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                          <span className="font-semibold">
                            {formatNumber(application.quantity)}
                          </span>{" "}
                          <span className="text-slate-500">
                            {application.unit || ""}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {formatDate(application.application_date)}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {application.farm_act_id
                            ? `Activity #${application.farm_act_id}`
                            : "—"}
                        </td>

                        <td className="max-w-[180px] px-5 py-4">
                          <p
                            className="truncate text-slate-500"
                            title={application.notes || ""}
                          >
                            {application.notes || "—"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(application)}
                              className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 transition hover:bg-blue-100"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(application)}
                              className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
            Showing {filteredApplications.length} of {applications.length}{" "}
            applications
          </div>
        </section>
      </div>

      {/* ADD / EDIT MODAL */}
      {showForm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              resetForm();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="application-modal-title"
            className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-blue-900">
                  Farm Management
                </p>

                <h2
                  id="application-modal-title"
                  className="font-serif text-xl font-semibold text-slate-900"
                >
                  {editingId !== null
                    ? "Edit Input Application"
                    : "Add Input Application"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Record the actual quantity applied to a planting cycle.
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

            <div className="overflow-y-auto px-5 py-6 sm:px-7">
              <form
                id="application-form"
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                <div
                  className={`rounded-xl border p-4 ${
                    formData.input_category === "PESTICIDE"
                      ? "border-rose-100 bg-rose-50"
                      : formData.input_category === "OTHER"
                        ? "border-amber-100 bg-amber-50"
                        : "border-blue-100 bg-blue-50"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {selectedCategory?.label || "Input Application Details"}
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {selectedCategory?.description}
                  </p>

                  <p className="mt-2 text-xs font-medium text-slate-600">
                    {formData.input_category === "PESTICIDE"
                      ? "Allowed units: mL or L. Record the actual amount used."
                      : "Standard unit: kg. Record the actual fertilizer weight used."}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <FormField
                    label="Planting Record"
                    required
                    hint="Every application must belong to a planting cycle."
                  >
                    <select
                      name="farm_planting_harvesting_id"
                      value={formData.farm_planting_harvesting_id}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    >
                      <option value="">Select Planting Record</option>

                      {plantingRecords.map((record) => (
                        <option key={record.id} value={record.id}>
                          {getPlantingLabel(record)}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Input Category" required>
                    <select
                      name="input_category"
                      value={formData.input_category}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    >
                      {categoryOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField
                    label={
                      formData.input_category === "PESTICIDE"
                        ? "Pesticide Name"
                        : "Fertilizer Name"
                    }
                    required
                    hint={
                      formData.input_category === "PESTICIDE"
                        ? "Example: Pyzero 10 EC, insecticide, herbicide, or fungicide."
                        : "Example: Complete 14-14-14, Urea 46-0-0, or Ammonium Sulfate."
                    }
                  >
                    <input
                      type="text"
                      name="input_name"
                      value={formData.input_name}
                      onChange={handleChange}
                      placeholder={
                        formData.input_category === "PESTICIDE"
                          ? "e.g. Pyzero 10 EC"
                          : "e.g. Urea 46-0-0"
                      }
                      maxLength={150}
                      required
                      className={inputClass}
                    />
                  </FormField>

                  <FormField
                    label="Actual Quantity Applied"
                    required
                    hint="Enter the amount actually used, not the number of bags or bottles."
                  >
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      min="0.01"
                      step="0.01"
                      placeholder="Enter actual quantity"
                      required
                      className={inputClass}
                    />
                  </FormField>

                  <FormField
                    label="Unit of Measurement"
                    required
                    hint={
                      formData.input_category === "PESTICIDE"
                        ? "Choose mL or L. These units are kept separate in reports."
                        : "Fertilizer quantities are recorded in kilograms."
                    }
                  >
                    <select
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    >
                      {!isCurrentUnitAllowed && formData.unit && (
                        <option value={formData.unit}>
                          Existing unit: {formData.unit} (choose a standard unit)
                        </option>
                      )}

                      {currentUnitOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Application Date" required>
                    <input
                      type="date"
                      name="application_date"
                      value={formData.application_date}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </FormField>

                  <FormField
                    label="Farm Activity ID (Optional)"
                    hint="Enter an existing Farm Activity ID only when this application is linked to a specific activity."
                  >
                    <input
                      type="number"
                      name="farm_act_id"
                      value={formData.farm_act_id}
                      onChange={handleChange}
                      min="1"
                      step="1"
                      placeholder="e.g. 12"
                      className={inputClass}
                    />
                  </FormField>

                  <div className="md:col-span-2">
                    <FormField label="Notes">
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows={3}
                        maxLength={1000}
                        placeholder="Additional details about this application..."
                        className={inputClass}
                      />
                    </FormField>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Quantity Example
                  </p>

                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    4 bags of NPK at 20 kg each = <strong>80 kg</strong>.
                    Two bottles of pesticide at 200 mL each =
                    <strong> 400 mL</strong>. Enter the calculated actual
                    quantity and select the matching unit.
                  </p>
                </div>
              </form>
            </div>

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
                form="application-form"
                disabled={saving || plantingRecords.length === 0}
                className="rounded-xl bg-blue-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId !== null
                    ? "Update Application"
                    : "Save Application"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
