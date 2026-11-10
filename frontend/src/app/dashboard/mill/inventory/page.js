
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../providers";
import { apiRequest } from "../../../../lib/api";
import {toast} from "react-toastify";
import {
  getLowStockInfo,
  LOW_STOCK_THRESHOLDS,
} from "../../../../lib/lowStock";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100";

const labelClass =
  "mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700";

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
  { id: "rice", label: "Milled Rice" },
  { id: "bran", label: "Rice Bran" },
  { id: "broken", label: "Broken Rice" },
];

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
  const [error, setError] = useState("");

  const loadRecords = useCallback(async () => {
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
        record?.warehouse_location,
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

  const getStockDisplay = (record) => {
    const quantity = Number(record?.stock_quantity || 0);

    if (getCategory(record) === "Rice" && isSackRecord(record)) {
      return (
        <div className="space-y-1">
          <p className="font-semibold text-slate-800">
            {formatNumber(record.sack_quantity)} sacks
          </p>
          <p className="text-xs text-slate-500">
            {formatNumber(quantity)} kg total
          </p>
        </div>
      );
    }

    return (
      <div>
        <p className="font-semibold text-slate-800">
          {formatNumber(quantity)} kg
        </p>
        {getCategory(record) === "Rice" && (
          <p className="text-xs text-slate-500">
            Loose / Tingi-tingi
          </p>
        )}
      </div>
    );
  };

  const getCategoryBadge = (category) => {
    const styles = {
      Rice: "bg-emerald-50 text-emerald-700",
      Bran: "bg-amber-50 text-amber-700",
      "Broken Rice": "bg-violet-50 text-violet-700",
    };

    const labels = {
      Rice: "Milled Rice",
      Bran: "Rice Bran",
      "Broken Rice": "Broken Rice",
    };

    return (
      <span
        className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
          styles[category] || "bg-slate-100 text-slate-600"
        }`}
      >
        {labels[category] || category}
      </span>
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-900">
              Mill Management
            </p>

            <h1 className="font-serif text-3xl font-semibold text-slate-900">
              Mill Inventory
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Monitor available milled rice, rice bran, and broken rice stocks.
            </p>
          </div>

          <button
            type="button"
            onClick={loadRecords}
            disabled={loading}
            className="rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:bg-blue-800 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "↻ Refresh Inventory"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && lowStockRecords.length > 0 && (
          <section
            role="alert"
            className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900"
          >
            <h2 className="font-semibold">
              Low stock warning ({lowStockRecords.length})
            </h2>
            <p className="mt-1 text-sm">
              Rice stock is at or below {LOW_STOCK_THRESHOLDS.sacks} sacks or{" "}
              {formatNumber(LOW_STOCK_THRESHOLDS.looseRiceKg)} kg for loose rice.
              Please plan to replenish these items.
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
              {lowStockRecords.map((record) => {
                const lowStock = getLowStockInfo(record);

                return (
                  <li key={record.id}>
                    {getItemName(record)}
                    {record.variety ? ` (${record.variety})` : ""}:{" "}
                    {formatNumber(lowStock.quantity)} {lowStock.unit} remaining
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Inventory Tabs */}
        <div className="border-b border-slate-200">
          <div className="flex flex-wrap gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 px-1 py-3 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "border-blue-900 text-blue-900"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search and Filters */}
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div
            className={`grid grid-cols-1 gap-3 ${
              activeTab === "rice"
                ? "md:grid-cols-[minmax(0,1fr)_190px_210px]"
                : "md:grid-cols-[minmax(0,1fr)_210px]"
            }`}
          >
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path strokeLinecap="round" d="m20 20-4-4" />
                </svg>
              </span>

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search item, variety, Mill ID..."
                className={`${inputClass} pl-11`}
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className={inputClass}
            >
              <option value="all">All Category</option>
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
              <label className={labelClass}>Minimum Stock (kg)</label>
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
              <label className={labelClass}>Maximum Stock (kg)</label>
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
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Clear Filters
            </button>
          </div>

          {invalidStockRange && (
            <p className="text-sm text-red-600">
              Minimum stock cannot be greater than maximum stock.
            </p>
          )}
        </section>

        {/* Inventory Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {tabs.find((tab) => tab.id === activeTab)?.label} Inventory
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Total records: {invalidStockRange ? 0 : filteredRecords.length}
              </p>
            </div>

            <p className="text-xs text-slate-500">
              Stock quantities are displayed in kilograms.
            </p>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Loading inventory records...
            </div>
          ) : invalidStockRange ? (
            <div className="p-12 text-center text-sm text-red-600">
              Please correct your stock range filters.
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="font-semibold text-slate-800">
                No inventory records found.
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Try changing your search or filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-225 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-bold">Batch / Mill ID</th>
                    <th className="px-5 py-4 font-bold">Item Description</th>
                    <th className="px-5 py-4 font-bold">Variety</th>
                    <th className="px-5 py-4 font-bold">Category</th>
                    <th className="px-5 py-4 font-bold">Available Stock</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((record) => {
                    const category = getCategory(record);

                    return (
                      <tr
                        key={record.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-5 py-4">
                          <p className="font-semibold text-slate-800">
                            {getBatchLabel(record)}
                          </p>

                          {record.source_key && (
                            <span className="mt-1 inline-flex rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
                              Milling Generated
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">
                            {getItemName(record)}
                          </p>

                          {category === "Rice" && (
                            <p className="mt-1 text-xs text-slate-500">
                              {getRiceType(record)}
                            </p>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {category === "Rice"
                            ? getVarietyName(record)
                            : record?.variety || "—"}
                        </td>

                        <td className="px-5 py-4">
                          {getCategoryBadge(category)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          {getStockDisplay(record)}
                          {getCategory(record) === "Rice" &&
                            getLowStockInfo(record) && (
                              <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                                Low stock
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

          <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
            <p className="text-xs text-slate-500">
              Inventory is read-only. Make stock corrections through the Milling module.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
