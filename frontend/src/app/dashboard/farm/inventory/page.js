"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../providers";
import { apiRequest } from "../../../../lib/api";
import { toast } from "react-toastify";
import SeasonSelect from "../../../../components/dashboard/SeasonSelect";
import SeasonHistoryFilters from "../../../../components/dashboard/SeasonHistoryFilters";
import {
  getHistoryYears,
  getSeasonLabel,
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
  season_id: "",
  farm_act_id: "",
  item_category: "",
  item_name: "",
  quantity: "0",
  unit: "",
  unit_price: "0",
  date_acquired: "",
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

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(amount) || 0);
}

function getInventoryTotal(record) {
  if (record.total_cost !== null && record.total_cost !== undefined) {
    return Number(record.total_cost) || 0;
  }

  return (
    (Number(record.quantity) || 0) *
    (Number(record.unit_price) || 0)
  );
}

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

const inputClass =
  "w-full rounded-xl border border-[#54ACBF]/30 bg-[#A7EBF2]/10 px-3.5 py-2.5 text-[12px] text-[#011C40] outline-none transition placeholder:text-slate-400 focus:border-[#26658C] focus:bg-white focus:ring-2 focus:ring-[#54ACBF]/15";

/* MAIN PAGE */
export default function FarmInventory() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [inventory, setInventory] = useState([]);
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

  const historyFilters = useMemo(
    () => ({
      search: historySearch,
      type: historyType,
      year: historyYear,
    }),
    [historySearch, historyType, historyYear]
  );

  const filteredInventory = useMemo(
    () =>
      inventory.filter((record) =>
        matchesSeasonHistory(
          record,
          seasons,
          historyFilters,
          "season_id"
        )
      ),
    [inventory, seasons, historyFilters]
  );

  const historyYears = useMemo(
    () => getHistoryYears(inventory, seasons, "season_id"),
    [inventory, seasons]
  );

  const estimatedTotal =
    (Number(formData.quantity) || 0) *
    (Number(formData.unit_price) || 0);

  const totalInventoryValue = useMemo(
    () =>
      inventory.reduce(
        (total, record) => total + getInventoryTotal(record),
        0
      ),
    [inventory]
  );

  const totalCategories = useMemo(
    () =>
      new Set(
        inventory
          .map((record) =>
            String(record.item_category || "")
              .trim()
              .toLowerCase()
          )
          .filter(Boolean)
      ).size,
    [inventory]
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
      const [inventoryResponse, seasonResponse] = await Promise.all([
        apiRequest("farm/inventory", { token }),
        apiRequest("seasons", { token }),
      ]);

      setInventory(getResponseData(inventoryResponse));
      setSeasons(getResponseData(seasonResponse));
    } catch (requestError) {
      const message =
        requestError.message ||
        "Unable to load farm inventory records.";

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
    setFormData({
      season_id: record.season_id ?? "",
      farm_act_id: record.farm_act_id ?? "",
      item_category: record.item_category ?? "",
      item_name: record.item_name ?? "",
      quantity: String(record.quantity ?? "0"),
      unit: record.unit ?? "",
      unit_price: String(record.unit_price ?? "0"),
      date_acquired: record.date_acquired ?? "",
    });

    setEditingId(record.id);
    setError("");
    setShowForm(true);
  };

  /* SAVE INVENTORY */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error("Your session has expired. Please sign in again.");
      return;
    }

    if (!formData.season_id) {
      toast.error("Please select a season.");
      return;
    }

    if (
      !formData.item_category.trim() ||
      !formData.item_name.trim()
    ) {
      toast.error("Please complete the required fields.");
      return;
    }

    const quantity = Number(formData.quantity);
    const unitPrice = Number(formData.unit_price);

    if (!Number.isFinite(quantity) || quantity < 0) {
      toast.error("Please enter a valid quantity.");
      return;
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      toast.error("Please enter a valid price per unit.");
      return;
    }

    const payload = {
      season_id: formData.season_id,
      farm_act_id:
        formData.farm_act_id === ""
          ? null
          : Number(formData.farm_act_id),
      item_category: formData.item_category.trim(),
      item_name: formData.item_name.trim(),
      quantity,
      unit: formData.unit.trim(),
      unit_price: unitPrice,
      date_acquired: formData.date_acquired || null,
    };

    setSaving(true);
    setError("");

    try {
      if (editingId !== null) {
        await apiRequest(`farm/inventory/${editingId}`, {
          method: "PUT",
          token,
          body: payload,
        });

        toast.success("Farm inventory item updated successfully.");
      } else {
        await apiRequest("farm/inventory", {
          method: "POST",
          token,
          body: payload,
        });

        toast.success("Farm inventory item added successfully.");
      }

      resetForm();
      await loadData();
    } catch (requestError) {
      const message =
        requestError.message ||
        "Unable to save the inventory item.";

      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  /* DELETE INVENTORY */
  const handleDelete = async (record) => {
    if (!token) {
      toast.error("Your session has expired. Please sign in again.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${record.item_name}"?`
    );

    if (!confirmed) return;

    setError("");

    try {
      await apiRequest(`farm/inventory/${record.id}`, {
        method: "DELETE",
        token,
      });

      toast.success("Farm inventory item deleted successfully.");
      await loadData();
    } catch (requestError) {
      const message =
        requestError.message ||
        "Unable to delete the inventory item.";

      setError(message);
      toast.error(message);
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
              Farm Inventory
            </h1>

            <p className="mt-1 text-[12px] text-[#26658C]">
              Manage seeds, fertilizers, equipment, and other farm supplies.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-[#023859] px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#011C40] disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
          >
            <span className="text-base leading-none">+</span>
            Add Inventory Item
          </button>
        </header>

        {/* SUMMARY CARDS */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">

          {/* TOTAL ITEMS */}
          <div className="flex items-center gap-3 rounded-xl border border-[#54ACBF]/25 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A7EBF2]/40 text-lg text-[#26658C]">
              📦
            </div>

            <div>
              <p className="text-[11px] font-medium text-[#26658C]">
                Total Inventory Items
              </p>

              <p className="mt-0.5 text-xl font-bold text-[#011C40]">
                {loading ? "..." : inventory.length}
              </p>
            </div>
          </div>

          {/* TOTAL CATEGORIES */}
          <div className="flex items-center gap-3 rounded-xl border border-[#54ACBF]/25 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A7EBF2]/40 text-lg text-[#26658C]">
              🗂️
            </div>

            <div>
              <p className="text-[11px] font-medium text-[#26658C]">
                Inventory Categories
              </p>

              <p className="mt-0.5 text-xl font-bold text-[#011C40]">
                {loading ? "..." : totalCategories}
              </p>
            </div>
          </div>

          {/* TOTAL VALUE */}
          <div className="flex items-center gap-3 rounded-xl border border-[#54ACBF]/25 bg-white p-4 shadow-sm sm:col-span-2 lg:col-span-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A7EBF2]/40 text-lg text-[#26658C]">
              ₱
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-medium text-[#26658C]">
                Total Estimated Value
              </p>

              <p className="mt-0.5 truncate text-xl font-bold text-[#011C40]">
                {loading ? "..." : formatCurrency(totalInventoryValue)}
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
              aria-labelledby="farm-inventory-modal-title"
              className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#54ACBF]/30 bg-white shadow-2xl"
            >

              {/* MODAL HEADER */}
              <div className="flex items-center justify-between gap-4 border-b border-[#A7EBF2]/60 px-5 py-4 sm:px-6">
                <div>
                  <p className="mb-1 text-[9px] font-extrabold tracking-[1.3px] text-[#54ACBF]">
                    FARM MANAGEMENT
                  </p>

                  <h2
                    id="farm-inventory-modal-title"
                    className="text-lg font-bold text-[#011C40]"
                  >
                    {editingId !== null
                      ? "Edit Inventory Item"
                      : "Add Inventory Item"}
                  </h2>

                  <p className="mt-1 text-[11px] text-[#26658C]">
                    Enter the details of the farm inventory item.
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

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                    {/* SEASON */}
                    <FormField
                      label="Season"
                      required
                      htmlFor="season_id"
                    >
                      <SeasonSelect
                        id="season_id"
                        name="season_id"
                        value={formData.season_id}
                        seasons={seasons}
                        valueField="season_id"
                        onChange={handleChange}
                      />

                      {seasons.length === 0 && (
                        <p className="mt-2 text-[11px] text-amber-700">
                          No season records available. Please create a season first.
                        </p>
                      )}
                    </FormField>

                    {/* FARM ACTIVITY ID */}
                    <FormField
                      label="Farm Activity ID"
                      htmlFor="farm_act_id"
                      hint="Optional. Link this item to a farm activity."
                    >
                      <input
                        id="farm_act_id"
                        type="number"
                        min="1"
                        step="1"
                        name="farm_act_id"
                        value={formData.farm_act_id}
                        onChange={handleChange}
                        placeholder="Enter farm activity ID"
                        className={inputClass}
                      />
                    </FormField>

                    {/* CATEGORY */}
                    <FormField
                      label="Category"
                      required
                      htmlFor="item_category"
                      hint="Example: Seeds, Fertilizers, Equipment"
                    >
                      <input
                        id="item_category"
                        type="text"
                        name="item_category"
                        value={formData.item_category}
                        onChange={handleChange}
                        required
                        placeholder="Enter item category"
                        className={inputClass}
                      />
                    </FormField>

                    {/* ITEM NAME */}
                    <FormField
                      label="Item Name"
                      required
                      htmlFor="item_name"
                    >
                      <input
                        id="item_name"
                        type="text"
                        name="item_name"
                        value={formData.item_name}
                        onChange={handleChange}
                        required
                        placeholder="Enter item name"
                        className={inputClass}
                      />
                    </FormField>

                    {/* QUANTITY */}
                    <FormField
                      label="Quantity"
                      htmlFor="quantity"
                    >
                      <input
                        id="quantity"
                        type="number"
                        name="quantity"
                        min="0"
                        step="0.01"
                        value={formData.quantity}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </FormField>

                    {/* UNIT */}
                    <FormField
                      label="Unit"
                      htmlFor="unit"
                      hint="Example: kg, sack, liter, piece"
                    >
                      <input
                        id="unit"
                        type="text"
                        name="unit"
                        value={formData.unit}
                        onChange={handleChange}
                        placeholder="Enter unit"
                        className={inputClass}
                      />
                    </FormField>

                    {/* UNIT PRICE */}
                    <FormField
                      label="Price per Unit (₱)"
                      htmlFor="unit_price"
                    >
                      <input
                        id="unit_price"
                        type="number"
                        name="unit_price"
                        min="0"
                        step="0.01"
                        value={formData.unit_price}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </FormField>

                    {/* DATE ACQUIRED */}
                    <FormField
                      label="Date Acquired"
                      htmlFor="date_acquired"
                    >
                      <input
                        id="date_acquired"
                        type="date"
                        name="date_acquired"
                        value={formData.date_acquired}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </FormField>

                  </div>

                  {/* ESTIMATED TOTAL */}
                  <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-[#54ACBF]/25 bg-[#A7EBF2]/15 p-4">
                    <div>
                      <p className="text-[11px] font-semibold text-[#26658C]">
                        Estimated Total Cost
                      </p>

                      <p className="mt-0.5 text-[10px] text-[#26658C]/70">
                        Quantity × Price per Unit
                      </p>
                    </div>

                    <p className="text-lg font-bold text-[#023859]">
                      {formatCurrency(estimatedTotal)}
                    </p>
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
                    disabled={saving || seasons.length === 0}
                    className="rounded-xl bg-[#023859] px-6 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#011C40] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : editingId !== null
                        ? "Update Inventory"
                        : "Save Inventory"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {/* INVENTORY RECORDS */}
        <section className="overflow-hidden rounded-xl border border-[#54ACBF]/25 bg-white shadow-sm">

          {/* TABLE HEADER */}
          <div className="flex flex-col gap-3 border-b border-[#A7EBF2]/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-base font-bold text-[#011C40]">
                Inventory Records
              </h2>

              <p className="mt-1 text-[11px] text-[#26658C]">
                Showing {filteredInventory.length} of {inventory.length} records
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
              resultCount={filteredInventory.length}
              totalCount={inventory.length}
            />
          </div>

          {/* LOADING */}
          {loading ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#A7EBF2] border-t-[#26658C]" />

              <p className="text-[12px] text-[#26658C]">
                Loading inventory records...
              </p>
            </div>
          ) : inventory.length === 0 ? (

            /* EMPTY STATE */
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#A7EBF2]/30 text-2xl">
                📦
              </div>

              <h3 className="text-sm font-bold text-[#011C40]">
                No Inventory Records Yet
              </h3>

              <p className="mx-auto mt-1 max-w-sm text-[11px] text-[#26658C]">
                Add your first inventory item to start tracking your farm supplies.
              </p>
            </div>
          ) : filteredInventory.length === 0 ? (

            /* NO FILTER RESULTS */
            <div className="p-12 text-center">
              <div className="mb-3 text-3xl">⌕</div>

              <h3 className="text-sm font-semibold text-[#011C40]">
                No Matching Records
              </h3>

              <p className="mt-1 text-[11px] text-[#26658C]">
                No inventory records match your current search and filters.
              </p>
            </div>
          ) : (

            /* INVENTORY TABLE */
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-[11px]">

                <thead className="bg-[#A7EBF2]/20 text-[10px] uppercase tracking-wider text-[#023859]">
                  <tr>
                    <th className="px-4 py-3.5 font-bold">
                      Item
                    </th>

                    <th className="px-4 py-3.5 font-bold">
                      Category
                    </th>

                    <th className="px-4 py-3.5 font-bold">
                      Season
                    </th>

                    <th className="px-4 py-3.5 font-bold">
                      Quantity
                    </th>

                    <th className="px-4 py-3.5 font-bold">
                      Unit
                    </th>

                    <th className="px-4 py-3.5 font-bold">
                      Unit Price
                    </th>

                    <th className="px-4 py-3.5 font-bold">
                      Total Cost
                    </th>

                    <th className="px-4 py-3.5 font-bold">
                      Date Acquired
                    </th>

                    <th className="px-4 py-3.5 text-right font-bold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#A7EBF2]/30">
                  {filteredInventory.map((record) => (
                    <tr
                      key={record.id}
                      className="transition hover:bg-[#A7EBF2]/10"
                    >
                      <td className="px-4 py-3.5 font-semibold text-[#023859]">
                        {record.item_name || "—"}
                      </td>

                      <td className="px-4 py-3.5 text-slate-600">
                        {record.item_category || "—"}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-flex whitespace-nowrap rounded-full border border-[#54ACBF]/25 bg-[#A7EBF2]/20 px-2.5 py-1 text-[10px] font-semibold text-[#023859]">
                          {getSeasonLabel(
                            seasons.find(
                              (season) =>
                                String(season.season_id) ===
                                String(record.season_id)
                            ),
                            record.season_id
                          ) || "—"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-[#011C40]">
                        {record.quantity ?? "—"}
                      </td>

                      <td className="px-4 py-3.5 text-slate-600">
                        {record.unit || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                        {formatCurrency(record.unit_price)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-bold text-[#023859]">
                        {formatCurrency(getInventoryTotal(record))}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                        {formatDate(record.date_acquired)}
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
          {!loading && filteredInventory.length > 0 && (
            <div className="border-t border-[#A7EBF2]/40 bg-[#A7EBF2]/10 px-4 py-3">
              <p className="text-[10px] text-[#26658C]">
                Displaying{" "}
                <span className="font-bold text-[#023859]">
                  {filteredInventory.length}
                </span>{" "}
                inventory record(s).
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
