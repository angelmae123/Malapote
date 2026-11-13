
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../providers";
import { apiRequest } from "../../../../lib/api";
import { toast } from "react-toastify";
import {
  getLowStockInfo,
  LOW_STOCK_THRESHOLDS,
} from "../../../../lib/lowStock";

const COLORS = {
  light: "#A7EBF2",
  teal: "#54ACBF",
  medium: "#26658C",
  deep: "#023859",
  navy: "#011C40",
};

const inputClass =
  "w-full rounded-xl border border-[#B8D5E0] bg-white px-3.5 py-2.5 text-sm text-[#011C40] outline-none transition placeholder:text-slate-400 focus:border-[#26658C] focus:ring-2 focus:ring-[#A7EBF2]/60";

const labelClass =
  "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#26658C]";

const getResponseData = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.records)) return response.records;
  return [];
};

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("en-PH", {
    maximumFractionDigits: 2,
  });

const getCategory = (record) => {
  const category = String(record?.category || "").toLowerCase();
  const itemName = String(record?.item_name || "").toLowerCase();

  if (category.includes("bran") || itemName.includes("rice bran")) {
    return "Bran";
  }

  if (category.includes("broken") || itemName.includes("broken rice")) {
    return "Broken Rice";
  }

  return "Rice";
};

const getItemName = (record) => {
  const category = getCategory(record);
  const itemName = String(record?.item_name || "").trim();

  if (category === "Bran") return "Rice Bran";
  if (category === "Broken Rice") return "Broken Rice";

  return itemName || "Milled Rice";
};

const isSackRecord = (record) =>
  Number(record?.sack_quantity || 0) > 0;

const getSackWeight = (record) =>
  Number(record?.sack_weight_kg || 0);

const getRiceType = (record) => {
  if (!isSackRecord(record)) {
    return "Loose Rice (Tingi-tingi)";
  }

  const weight = getSackWeight(record);

  if (weight === 50) return "50 kg Sack";
  if (weight === 25) return "25 kg Sack";

  return `${formatNumber(weight)} kg Sack`;
};

const getVarietyName = (record) =>
  record?.variety?.trim() || "Unspecified Variety";

const getBatchLabel = (record) =>
  record?.milling_code?.trim() || "Manual Entry";

const getRecordDisplayName = (record) => {
  if (getCategory(record) === "Rice") {
    return `${getItemName(record)} - ${getRiceType(record)}`;
  }

  return getItemName(record);
};

const tabs = [
  { id: "rice", label: "Milled Rice", icon: "🌾", category: "Rice" },
  { id: "bran", label: "Rice Bran", icon: "🌿", category: "Bran" },
  {
    id: "broken",
    label: "Broken Rice",
    icon: "🌾",
    category: "Broken Rice",
  },
];

function SummaryCard({ title, value, description, icon, accent }) {
  return (
    <div className="rounded-2xl border border-[#54ACBF]/25 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
            {title}
          </p>

          <p className="mt-2 break-words text-xl font-bold text-[#011C40] sm:text-2xl">
            {value}
          </p>

          <p className="mt-1 text-[11px] text-slate-500">
            {description}
          </p>
        </div>

        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
          style={{
            backgroundColor: accent,
            color: COLORS.navy,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function CategoryBadge({ category }) {
  const styles = {
    Rice: "border-[#A7EBF2] bg-[#E8FAFC] text-[#023859]",
    Bran: "border-[#B8D5E0] bg-[#EDF6FA] text-[#26658C]",
    "Broken Rice":
      "border-[#B8D5E0] bg-[#F0F6F9] text-[#023859]",
  };

  const labels = {
    Rice: "Milled Rice",
    Bran: "Rice Bran",
    "Broken Rice": "Broken Rice",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold ${
        styles[category] ||
        "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {labels[category] || category}
    </span>
  );
}

function StockDisplay({ record }) {
  const quantity = Number(record?.stock_quantity || 0);

  if (getCategory(record) === "Rice" && isSackRecord(record)) {
    return (
      <div className="space-y-1">
        <p className="font-bold text-[#023859]">
          {formatNumber(record.sack_quantity)} sacks
        </p>
        <p className="text-[10px] text-slate-500">
          {formatNumber(quantity)} kg total
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="font-bold text-[#023859]">
        {formatNumber(quantity)} kg
      </p>

      {getCategory(record) === "Rice" && (
        <p className="text-[10px] text-slate-500">
          Loose / Tingi-tingi
        </p>
      )}
    </div>
  );
}

function LowStockWarning({ records }) {
  if (!records.length) return null;

  return (
    <section
      role="alert"
      className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg">
          ⚠
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-amber-900">
            Low Stock Warning ({records.length})
          </h2>

          <p className="mt-1 text-xs leading-relaxed text-amber-800">
            Some rice inventory records have reached the low-stock
            threshold. Please plan to replenish these items.
          </p>

          <div className="mt-3 space-y-2">
            {records.map((record) => {
              const lowStock = getLowStockInfo(record);

              return (
                <div
                  key={record.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-white/80 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-amber-950">
                      {getItemName(record)}
                    </p>

                    {record.variety && (
                      <p className="mt-0.5 text-[10px] text-amber-800">
                        {record.variety}
                      </p>
                    )}
                  </div>

                  <span className="text-xs font-bold text-amber-800">
                    {formatNumber(lowStock.quantity)} {lowStock.unit} remaining
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center px-5 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#A7EBF2]/20 text-2xl">
        📦
      </div>

      <h3 className="text-sm font-bold text-[#023859]">
        No inventory records found
      </h3>

      <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
        Try changing your search or filters to find inventory records.
      </p>
    </div>
  );
}

export default function MillInventory() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [records, setRecords] = useState([]);
  const [activeTab, setActiveTab] = useState("rice");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [varietyFilter, setVarietyFilter] = useState("all");
  const [minStock, setMinStock] = useState("");
  const [maxStock, setMaxStock] = useState("");
  const [loading, setLoading] = useState(true);

  const loadRecords = useCallback(async () => {
    if (!token) {
      setLoading(false);
      toast.error("Session expired. Please sign in again.");
      return;
    }

    try {
      setLoading(true);

      const response = await apiRequest("mill/inventory", {
        token,
      });

      setRecords(getResponseData(response));
    } catch (err) {
      toast.error(err?.message || "Failed to load mill inventory.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const availableVarieties = useMemo(() => {
    const varieties = records
      .filter((record) => getCategory(record) === "Rice")
      .map((record) => getVarietyName(record))
      .filter((variety) => variety !== "Unspecified Variety");

    return [...new Set(varieties)].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [records]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const minimum = minStock.trim() === "" ? null : Number(minStock);
    const maximum = maxStock.trim() === "" ? null : Number(maxStock);

    return records.filter((record) => {
      const category = getCategory(record);
      const stock = Number(record?.stock_quantity || 0);

      const matchesTab =
        (activeTab === "rice" && category === "Rice") ||
        (activeTab === "bran" && category === "Bran") ||
        (activeTab === "broken" && category === "Broken Rice");

      const matchesCategory =
        categoryFilter === "all" || category === categoryFilter;

      const matchesVariety =
        activeTab !== "rice" ||
        varietyFilter === "all" ||
        getVarietyName(record) === varietyFilter;

      const matchesMinimum = minimum === null || stock >= minimum;
      const matchesMaximum = maximum === null || stock <= maximum;

      const searchableText = [
        record?.item_name,
        record?.variety,
        record?.category,
        record?.milling_code,
        getBatchLabel(record),
        getRecordDisplayName(record),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch || searchableText.includes(normalizedSearch);

      return (
        matchesTab &&
        matchesCategory &&
        matchesVariety &&
        matchesMinimum &&
        matchesMaximum &&
        matchesSearch
      );
    });
  }, [
    records,
    activeTab,
    categoryFilter,
    varietyFilter,
    search,
    minStock,
    maxStock,
  ]);

  const lowStockRecords = useMemo(
    () =>
      records.filter(
        (record) =>
          getCategory(record) === "Rice" && getLowStockInfo(record)
      ),
    [records]
  );

  const summary = useMemo(() => {
    const rice = records.filter(
      (record) => getCategory(record) === "Rice"
    );

    const bran = records.filter(
      (record) => getCategory(record) === "Bran"
    );

    const broken = records.filter(
      (record) => getCategory(record) === "Broken Rice"
    );

    const totalStock = records.reduce(
      (sum, record) =>
        sum + Number(record?.stock_quantity || 0),
      0
    );

    const getCategoryStock = (items) =>
      items.reduce(
        (sum, record) =>
          sum + Number(record?.stock_quantity || 0),
        0
      );

    return {
      totalRecords: records.length,
      totalStock,
      riceRecords: rice.length,
      branRecords: bran.length,
      brokenRecords: broken.length,
      riceStock: getCategoryStock(rice),
      branStock: getCategoryStock(bran),
      brokenStock: getCategoryStock(broken),
    };
  }, [records]);

  const invalidStockRange =
    minStock.trim() !== "" &&
    maxStock.trim() !== "" &&
    Number(minStock) > Number(maxStock);

  const resetFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setVarietyFilter("all");
    setMinStock("");
    setMaxStock("");
  };

  return (
    <main className="min-h-screen bg-[#F3F8FA] p-3 text-[#011C40] sm:p-5 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-5">

        {/* PAGE HEADER */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#54ACBF]">
              Rice Mill Management
            </p>

            <h1 className="mt-1 font-serif text-2xl font-bold text-[#011C40] sm:text-3xl">
              Mill Inventory
            </h1>

            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Monitor available milled rice, rice bran, and broken rice stocks.
            </p>
          </div>

          <button
            type="button"
            onClick={loadRecords}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#023859] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#26658C] focus:outline-none focus:ring-2 focus:ring-[#54ACBF] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-base leading-none">↻</span>
            {loading ? "Refreshing..." : "Refresh Inventory"}
          </button>
        </header>

        {/* SUMMARY CARDS */}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Inventory"
            value={summary.totalRecords}
            description={`${formatNumber(summary.totalStock)} kg combined stock`}
            icon="📦"
            accent="#E8FAFC"
          />

          <SummaryCard
            title="Milled Rice"
            value={`${formatNumber(summary.riceStock)} kg`}
            description={`${summary.riceRecords} inventory record(s)`}
            icon="🌾"
            accent="#DDF5F8"
          />

          <SummaryCard
            title="Rice Bran"
            value={`${formatNumber(summary.branStock)} kg`}
            description={`${summary.branRecords} inventory record(s)`}
            icon="🌿"
            accent="#EAF3F8"
          />

          <SummaryCard
            title="Broken Rice"
            value={`${formatNumber(summary.brokenStock)} kg`}
            description={`${summary.brokenRecords} inventory record(s)`}
            icon="🌾"
            accent="#DCEEF4"
          />
        </section>

        {/* LOW STOCK WARNING */}
        {!loading && <LowStockWarning records={lowStockRecords} />}

        {/* INVENTORY MANAGEMENT */}
        <section className="overflow-hidden rounded-2xl border border-[#54ACBF]/25 bg-white shadow-sm">

          {/* TABS */}
          <div className="border-b border-[#54ACBF]/20 px-4 sm:px-5">
            <div className="flex gap-2 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex shrink-0 items-center gap-2 border-b-[3px] px-3 py-3.5 text-xs font-bold transition sm:px-4 ${
                    activeTab === tab.id
                      ? "border-[#023859] text-[#023859]"
                      : "border-transparent text-slate-500 hover:border-[#A7EBF2] hover:text-[#26658C]"
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* SEARCH AND FILTERS */}
          <div className="space-y-4 p-4 sm:p-5">
            <div
              className={`grid grid-cols-1 gap-3 ${
                activeTab === "rice"
                  ? "md:grid-cols-[minmax(0,1fr)_190px_210px]"
                  : "md:grid-cols-[minmax(0,1fr)_210px]"
              }`}
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#54ACBF]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path
                      strokeLinecap="round"
                      d="m20 20-4-4"
                    />
                  </svg>
                </span>

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search item, variety, Mill ID..."
                  className={`${inputClass} pl-10`}
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className={inputClass}
              >
                <option value="all">All Categories</option>
                <option value="Rice">Milled Rice</option>
                <option value="Bran">Rice Bran</option>
                <option value="Broken Rice">Broken Rice</option>
              </select>

              {activeTab === "rice" && (
                <select
                  value={varietyFilter}
                  onChange={(event) => setVarietyFilter(event.target.value)}
                  className={inputClass}
                >
                  <option value="all">All Varieties</option>
                  {availableVarieties.map((variety) => (
                    <option key={variety} value={variety}>
                      {variety}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div>
                <label className={labelClass}>
                  Minimum Stock (kg)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={minStock}
                  onChange={(event) => setMinStock(event.target.value)}
                  placeholder="Minimum kg"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Maximum Stock (kg)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={maxStock}
                  onChange={(event) => setMaxStock(event.target.value)}
                  placeholder="Maximum kg"
                  className={inputClass}
                />
              </div>

              <button
                type="button"
                onClick={resetFilters}
                className="rounded-xl border border-[#54ACBF]/35 bg-white px-4 py-2.5 text-xs font-bold text-[#26658C] transition hover:bg-[#A7EBF2]/15"
              >
                Clear Filters
              </button>
            </div>

            {invalidStockRange && (
              <p className="text-xs font-medium text-red-600">
                Minimum stock cannot be greater than maximum stock.
              </p>
            )}
          </div>
        </section>

        {/* INVENTORY TABLE */}
        <section className="overflow-hidden rounded-2xl border border-[#54ACBF]/25 bg-white shadow-sm">

          {/* TABLE HEADER */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#54ACBF]/20 p-4 sm:p-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#54ACBF]">
                Stock Monitoring
              </p>

              <h2 className="mt-1 text-base font-bold text-[#011C40]">
                {tabs.find((tab) => tab.id === activeTab)?.label} Inventory
              </h2>

              <p className="mt-1 text-[11px] text-slate-500">
                Total records:{" "}
                {invalidStockRange ? 0 : filteredRecords.length}
              </p>
            </div>

            <p className="text-[10px] text-slate-500">
              Stock quantities are displayed in kilograms.
            </p>
          </div>

          {/* TABLE CONTENT */}
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 p-10">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#D5EAF0] border-t-[#26658C]" />
              <p className="text-xs text-slate-500">
                Loading inventory records...
              </p>
            </div>
          ) : invalidStockRange ? (
            <div className="p-10 text-center text-xs text-red-600">
              Please correct your stock range filters.
            </div>
          ) : filteredRecords.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead className="bg-[#A7EBF2]/20 text-[10px] uppercase tracking-[0.12em] text-[#26658C]">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 font-bold">
                      Batch / Mill ID
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 font-bold">
                      Item Description
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 font-bold">
                      Variety
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 font-bold">
                      Category
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 font-bold">
                      Available Stock
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E5EEF2]">
                  {filteredRecords.map((record) => {
                    const category = getCategory(record);
                    const lowStock =
                      category === "Rice" && getLowStockInfo(record);

                    return (
                      <tr
                        key={record.id}
                        className="transition hover:bg-[#A7EBF2]/10"
                      >
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <p className="font-bold text-[#023859]">
                            {getBatchLabel(record)}
                          </p>

                          {record.source_key && (
                            <span className="mt-1 inline-flex rounded-full border border-[#A7EBF2] bg-[#E8FAFC] px-2 py-0.5 text-[9px] font-bold text-[#023859]">
                              Milling Generated
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-[#011C40]">
                            {getItemName(record)}
                          </p>

                          {category === "Rice" && (
                            <p className="mt-1 text-[10px] text-slate-500">
                              {getRiceType(record)}
                            </p>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                          {category === "Rice"
                            ? getVarietyName(record)
                            : record?.variety || "—"}
                        </td>

                        <td className="px-4 py-3.5">
                          <CategoryBadge category={category} />
                        </td>

                        <td className="whitespace-nowrap px-4 py-3.5">
                          <StockDisplay record={record} />

                          {lowStock && (
                            <span className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[9px] font-bold text-amber-800">
                              Low Stock
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TABLE FOOTER */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#54ACBF]/20 bg-[#F8FBFC] px-4 py-3 sm:px-5">
            <p className="text-[10px] text-slate-500">
              Inventory is read-only. Make stock corrections through the Milling module.
            </p>

            <p className="text-[10px] font-bold text-[#26658C]">
              {invalidStockRange ? 0 : filteredRecords.length} record(s)
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
