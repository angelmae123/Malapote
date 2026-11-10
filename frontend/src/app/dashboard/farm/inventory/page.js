
"use client";

import { useCallback, useEffect, useState } from "react";
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

export default function FarmInventory() {
  const { session } = useAuth();

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
  const [success, setSuccess] = useState("");

  const token = session?.accessToken;

  const historyFilters = {
    search: historySearch,
    type: historyType,
    year: historyYear,
  };

  const filteredInventory = inventory.filter((record) =>
    matchesSeasonHistory(record, seasons, historyFilters, "season_id")
  );

  const historyYears = getHistoryYears(inventory, seasons, "season_id");

  const estimatedTotal =
    (Number(formData.quantity) || 0) *
    (Number(formData.unit_price) || 0);

  const loadData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      toast.error("Your session has expired. Please sign in again.");
      return;
    }

    setLoading(true);

    try {
      const [inventoryResponse, seasonResponse] = await Promise.all([
        apiRequest("farm/inventory", { token }),
        apiRequest("seasons", { token }),
      ]);

      setInventory(getResponseData(inventoryResponse));
      setSeasons(getResponseData(seasonResponse));
    } catch (requestError) {
      toast.error(
        requestError.message || "Unable to load farm inventory records."
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
    toast.error("Unable to process this request right now. Please try again.");
  };

  const handleAdd = () => {
    setFormData(initialForm);
    setEditingId(null);
    toast.error("Unable to process this request right now. Please try again.");
    setSuccess("");
    setShowForm(true);
  };

  const handleEdit = (record) => {
    toast.error("Unable to process this request right now. Please try again.");
    setSuccess("");

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
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    toast.error("Unable to process this request right now. Please try again.");
    setSuccess("");

    if (!token) {
      toast.error("Your session has expired. Please sign in again.");
      return;
    }

    if (!formData.season_id) {
      toast.error("Please select a season.");
      return;
    }

    if (!formData.item_category.trim() || !formData.item_name.trim()) {
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
        formData.farm_act_id === "" ? null : Number(formData.farm_act_id),
      item_category: formData.item_category.trim(),
      item_name: formData.item_name.trim(),
      quantity,
      unit: formData.unit.trim(),
      unit_price: unitPrice,
      date_acquired: formData.date_acquired || null,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await apiRequest(`farm/inventory/${editingId}`, {
          method: "PUT",
          token,
          body: payload,
        });

        setSuccess("Farm inventory item updated successfully.");
      } else {
        await apiRequest("farm/inventory", {
          method: "POST",
          token,
          body: payload,
        });

        setSuccess("Farm inventory item added successfully.");
      }

      resetForm();
      await loadData();
    } catch (requestError) {
      toast.error(
        requestError.message || "Unable to save the inventory item."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${record.item_name}"?`
    );

    if (!confirmed) return;

    toast.error("Unable to process this request right now. Please try again.");
    setSuccess("");

    try {
      await apiRequest(`farm/inventory/${record.id}`, {
        method: "DELETE",
        token,
      });

      setSuccess("Farm inventory item deleted successfully.");
      await loadData();
    } catch (requestError) {
      toast.error(
        requestError.message || "Unable to delete the inventory item."
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
              Farm Inventory
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage seeds, fertilizers, equipment, and other farm supplies.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className="rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:bg-blue-800"
          >
            + Add Inventory Item
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
            className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !saving) {
                resetForm();
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="inventory-modal-title"
              className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-widest text-blue-900">
                    Farm Management
                  </p>

                  <h2
                    id="inventory-modal-title"
                    className="font-serif text-xl font-semibold text-slate-900"
                  >
                    {editingId !== null
                      ? "Edit Inventory Item"
                      : "Add Inventory Item"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Enter the inventory item details.
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

                    {/* Season */}
                    <div>
                      <label
                        htmlFor="season_id"
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Season <span className="text-red-500">*</span>
                      </label>

                      <SeasonSelect
                        id="season_id"
                        name="season_id"
                        value={formData.season_id}
                        seasons={seasons}
                        valueField="season_id"
                        onChange={handleChange}
                      />

                      {seasons.length === 0 && (
                        <p className="mt-2 text-xs text-amber-700">
                          No season records available. Please check the seasons table.
                        </p>
                      )}
                    </div>

                    {/* Farm Activity ID */}
                    <div>
                      <label
                        htmlFor="farm_act_id"
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Farm Activity ID
                      </label>

                      <input
                        id="farm_act_id"
                        type="number"
                        min="1"
                        step="1"
                        name="farm_act_id"
                        value={formData.farm_act_id}
                        onChange={handleChange}
                        placeholder="Enter farm activity ID"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10"
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <label
                        htmlFor="item_category"
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Category <span className="text-red-500">*</span>
                      </label>

                      <input
                        id="item_category"
                        type="text"
                        name="item_category"
                        value={formData.item_category}
                        onChange={handleChange}
                        required
                        placeholder="e.g. Seeds, Fertilizers, Equipment"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10"
                      />
                    </div>

                    {/* Item Name */}
                    <div>
                      <label
                        htmlFor="item_name"
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Item Name <span className="text-red-500">*</span>
                      </label>

                      <input
                        id="item_name"
                        type="text"
                        name="item_name"
                        value={formData.item_name}
                        onChange={handleChange}
                        required
                        placeholder="Enter item name"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10"
                      />
                    </div>

                    {/* Quantity */}
                    <div>
                      <label
                        htmlFor="quantity"
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Quantity
                      </label>

                      <input
                        id="quantity"
                        type="number"
                        name="quantity"
                        min="0"
                        step="0.01"
                        value={formData.quantity}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10"
                      />
                    </div>

                    {/* Unit */}
                    <div>
                      <label
                        htmlFor="unit"
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Unit
                      </label>

                      <input
                        id="unit"
                        type="text"
                        name="unit"
                        value={formData.unit}
                        onChange={handleChange}
                        placeholder="e.g. kg, sack, liter, piece"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10"
                      />
                    </div>

                    {/* Unit Price */}
                    <div>
                      <label
                        htmlFor="unit_price"
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Price per Unit (₱)
                      </label>

                      <input
                        id="unit_price"
                        type="number"
                        name="unit_price"
                        min="0"
                        step="0.01"
                        value={formData.unit_price}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10"
                      />
                    </div>

                    {/* Date Acquired */}
                    <div>
                      <label
                        htmlFor="date_acquired"
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Date Acquired
                      </label>

                      <input
                        id="date_acquired"
                        type="date"
                        name="date_acquired"
                        value={formData.date_acquired}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10"
                      />
                    </div>
                  </div>

                  {/* Estimated Total */}
                  <div className="mt-6 flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <span className="text-sm font-semibold text-blue-900">
                      Estimated Total Cost
                    </span>

                    <span className="text-lg font-bold text-blue-950">
                      {formatCurrency(estimatedTotal)}
                    </span>
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
                        ? "Update Inventory"
                        : "Save Inventory"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {/* Inventory Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Inventory Records
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Total items: {filteredInventory.length}
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
            resultCount={filteredInventory.length}
            totalCount={inventory.length}
          />

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Loading inventory records...
            </div>
          ) : inventory.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mb-3 text-4xl">📦</div>

              <h3 className="font-semibold text-slate-800">
                No inventory records yet
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Click Add Inventory Item to create your first record.
              </p>
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No inventory records match the selected search and filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-262.5 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-bold">Item</th>
                    <th className="px-5 py-4 font-bold">Category</th>
                    <th className="px-5 py-4 font-bold">Season</th>
                    <th className="px-5 py-4 font-bold">Quantity</th>
                    <th className="px-5 py-4 font-bold">Unit</th>
                    <th className="px-5 py-4 font-bold">Total Cost</th>
                    <th className="px-5 py-4 font-bold">Date Acquired</th>
                    <th className="px-5 py-4 text-right font-bold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredInventory.map((record) => (
                    <tr
                      key={record.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {record.item_name || "—"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {record.item_category || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                          {getSeasonLabel(
                            seasons.find(
                              (season) =>
                                season.season_id === record.season_id
                            ),
                            record.season_id
                          ) || "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {record.quantity ?? "—"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {record.unit || "—"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">
                        {formatCurrency(
                          record.total_cost ??
                          Number(record.quantity || 0) *
                          Number(record.unit_price || 0)
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {formatDate(record.date_acquired)}
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
