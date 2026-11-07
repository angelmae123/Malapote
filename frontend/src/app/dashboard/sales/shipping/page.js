
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../providers";
import { apiRequest } from "../../../../lib/api";

const EMPTY_FORM = {
  municipality: "",
  barangay: "",
  min_sacks: "1",
  max_sacks: "",
  shipping_fee: "0",
  status: "Active",
};

const STATUS_OPTIONS = ["Active", "Inactive"];

const API_ENDPOINT = "shipping-rates";

// RESPONSE HELPERS

function getResponseData(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.records)) return response.records;
  if (Array.isArray(response?.data?.records)) return response.data.records;

  return [];
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
  });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-PH");
}

function getSackRange(rate) {
  const minimum = Number(rate.min_sacks || 1);
  const maximum = rate.max_sacks;

  if (maximum === null || maximum === undefined || maximum === "") {
    return `${formatNumber(minimum)} sacks and above`;
  }

  if (Number(maximum) === minimum) {
    return `${formatNumber(minimum)} ${minimum === 1 ? "sack" : "sacks"}`;
  }

  return `${formatNumber(minimum)} - ${formatNumber(maximum)} sacks`;
}

function getLocation(rate) {
  if (rate.barangay) {
    return `${rate.barangay}, ${rate.municipality}`;
  }

  return `${rate.municipality} (All Barangays)`;
}

function getStatus(rate) {
  return rate.status === "Inactive" ? "Inactive" : "Active";
}

// MAIN COMPONENT

export default function ShippingRatesPage() {
  const { session } = useAuth();

  const token = session?.accessToken;

  const [shippingRates, setShippingRates] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  // LOAD SHIPPING RATES

  const loadShippingRates = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const response = await apiRequest(API_ENDPOINT, {
        token,
      });

      setShippingRates(getResponseData(response));
    } catch (err) {
      setError(err.message || "Unable to load shipping rates.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadShippingRates();
    }
  }, [token, loadShippingRates]);

  // FILTER SHIPPING RATES

  const filteredRates = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return shippingRates.filter((rate) => {
      const searchValues = [
        rate.municipality,
        rate.barangay,
        rate.min_sacks,
        rate.max_sacks,
        rate.shipping_fee,
      ];

      const matchesSearch =
        !keyword ||
        searchValues
          .filter((value) => value !== null && value !== undefined)
          .some((value) =>
            String(value).toLowerCase().includes(keyword)
          );

      const matchesStatus =
        statusFilter === "All" || getStatus(rate) === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [shippingRates, search, statusFilter]);

  // SUMMARY

  const summary = useMemo(() => {
    const active = shippingRates.filter(
      (rate) => getStatus(rate) === "Active"
    ).length;

    const inactive = shippingRates.filter(
      (rate) => getStatus(rate) === "Inactive"
    ).length;

    const uniqueMunicipalities = new Set(
      shippingRates
        .map((rate) => rate.municipality?.trim().toLowerCase())
        .filter(Boolean)
    );

    return {
      total: shippingRates.length,
      active,
      inactive,
      municipalities: uniqueMunicipalities.size,
    };
  }, [shippingRates]);

  // MODAL HANDLING

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingRate(null);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    resetForm();
    setError("");
  }

  function openAddModal() {
    resetForm();
    setError("");
    setModalOpen(true);
  }

  function openEditModal(rate) {
    setEditingRate(rate);

    setForm({
      municipality: rate.municipality ?? "",
      barangay: rate.barangay ?? "",
      min_sacks: String(rate.min_sacks ?? "1"),
      max_sacks:
        rate.max_sacks === null || rate.max_sacks === undefined
          ? ""
          : String(rate.max_sacks),
      shipping_fee: String(rate.shipping_fee ?? "0"),
      status: rate.status === "Inactive" ? "Inactive" : "Active",
    });

    setError("");
    setModalOpen(true);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // VALIDATION

  function validateForm() {
    if (!form.municipality.trim()) {
      return "Municipality is required.";
    }

    if (
      form.min_sacks === "" ||
      !Number.isInteger(Number(form.min_sacks)) ||
      Number(form.min_sacks) < 1
    ) {
      return "Minimum sacks must be a whole number starting from 1.";
    }

    if (
      form.max_sacks !== "" &&
      (!Number.isInteger(Number(form.max_sacks)) ||
        Number(form.max_sacks) < Number(form.min_sacks))
    ) {
      return "Maximum sacks must be greater than or equal to minimum sacks.";
    }

    if (
      form.shipping_fee === "" ||
      !Number.isFinite(Number(form.shipping_fee)) ||
      Number(form.shipping_fee) < 0
    ) {
      return "Please enter a valid shipping fee.";
    }

    return "";
  }

  // SAVE SHIPPING RATE

  async function handleSubmit(event) {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      municipality: form.municipality.trim(),
      barangay: form.barangay.trim() || null,
      min_sacks: Number(form.min_sacks),
      max_sacks:
        form.max_sacks === "" ? null : Number(form.max_sacks),
      shipping_fee: Number(form.shipping_fee),
      status: form.status,
    };

    try {
      if (editingRate) {
        await apiRequest(`${API_ENDPOINT}/${editingRate.id}`, {
          method: "PUT",
          token,
          body: payload,
        });

        setNotice("Shipping rate updated successfully.");
      } else {
        await apiRequest(API_ENDPOINT, {
          method: "POST",
          token,
          body: payload,
        });

        setNotice("Shipping rate added successfully.");
      }

      setModalOpen(false);
      resetForm();

      await loadShippingRates();
    } catch (err) {
      setError(err.message || "Unable to save shipping rate.");
    } finally {
      setSaving(false);
    }
  }

  // DELETE SHIPPING RATE

  async function handleDelete(rate) {
    const confirmed = window.confirm(
      `Are you sure you want to delete the shipping rate for ${getLocation(rate)}?`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await apiRequest(`${API_ENDPOINT}/${rate.id}`, {
        method: "DELETE",
        token,
      });

      setNotice("Shipping rate deleted successfully.");

      await loadShippingRates();
    } catch (err) {
      setError(err.message || "Unable to delete shipping rate.");
    }
  }

  // PAGE

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}

        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-900">
              Sales Management
            </p>

            <h1 className="font-serif text-3xl font-semibold text-slate-900">
              Shipping Rates
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Manage delivery fees based on the customer's municipality,
              barangay, and total number of sacks ordered.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            + Add Shipping Rate
          </button>
        </header>

        {/* ALERTS */}

        {error && !modalOpen && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {notice && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {notice}
          </div>
        )}

        {/* SUMMARY */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total Shipping Rates"
            value={formatNumber(summary.total)}
          />

          <SummaryCard
            label="Active Rates"
            value={formatNumber(summary.active)}
          />

          <SummaryCard
            label="Inactive Rates"
            value={formatNumber(summary.inactive)}
          />

          <SummaryCard
            label="Covered Municipalities"
            value={formatNumber(summary.municipalities)}
          />
        </section>

        {/* SHIPPING RATES TABLE */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Shipping Rate List
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Delivery fees are configured per destination and sack range.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search destination..."
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-800"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-800"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>

              <button
                type="button"
                onClick={loadShippingRates}
                disabled={loading}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">

              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4">Destination</th>
                  <th className="px-5 py-4">Minimum Sacks</th>
                  <th className="px-5 py-4">Maximum Sacks</th>
                  <th className="px-5 py-4">Sack Range</th>
                  <th className="px-5 py-4">Shipping Fee</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {loading ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      Loading shipping rates...
                    </td>
                  </tr>
                ) : filteredRates.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      No shipping rates found.
                    </td>
                  </tr>
                ) : (
                  filteredRates.map((rate) => (
                    <tr
                      key={rate.id}
                      className="transition hover:bg-slate-50"
                    >

                      {/* DESTINATION */}

                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {rate.municipality}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {rate.barangay || "All Barangays"}
                        </p>
                      </td>

                      {/* MINIMUM */}

                      <td className="px-5 py-4">
                        {formatNumber(rate.min_sacks)}
                      </td>

                      {/* MAXIMUM */}

                      <td className="px-5 py-4">
                        {rate.max_sacks === null ||
                        rate.max_sacks === undefined ||
                        rate.max_sacks === ""
                          ? "No limit"
                          : formatNumber(rate.max_sacks)}
                      </td>

                      {/* SACK RANGE */}

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-900">
                          {getSackRange(rate)}
                        </span>
                      </td>

                      {/* SHIPPING FEE */}

                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {formatCurrency(rate.shipping_fee)}
                      </td>

                      {/* STATUS */}

                      <td className="px-5 py-4">
                        <StatusBadge status={getStatus(rate)} />
                      </td>

                      {/* ACTIONS */}

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">

                          <button
                            type="button"
                            onClick={() => openEditModal(rate)}
                            className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(rate)}
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>

                        </div>
                      </td>

                    </tr>
                  ))
                )}

              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-500">
            Showing {filteredRates.length} of {shippingRates.length} shipping rates
          </div>

        </section>

        {/* INFORMATION */}

        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-lg text-blue-900">
              ℹ
            </span>

            <div>
              <h3 className="text-sm font-bold text-blue-900">
                How Shipping Rates Work
              </h3>

              <p className="mt-1 text-xs leading-6 text-blue-800">
                The system uses the customer's delivery location and total
                number of sacks to determine the applicable shipping fee.
                A blank barangay means the rate applies to all barangays
                within that municipality. A blank maximum sack value means
                there is no upper sack limit.
              </p>
            </div>
          </div>
        </section>

      </div>

      {/* ADD / EDIT MODAL */}

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 sm:p-5">

          <div className="flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-900">
                  Sales Management
                </p>

                <h2 className="mt-1 font-serif text-xl font-semibold text-slate-900">
                  {editingRate ? "Edit Shipping Rate" : "Add Shipping Rate"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >

              <div className="flex-1 space-y-5 overflow-y-auto p-6">

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {/* DESTINATION */}

                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-900">
                    Delivery Destination
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">

                    <FormField label="Municipality" required>
                      <input
                        name="municipality"
                        value={form.municipality}
                        onChange={handleChange}
                        required
                        maxLength={150}
                        className={inputClass}
                        placeholder="e.g. Mamburao"
                      />
                    </FormField>

                    <FormField label="Barangay">
                      <input
                        name="barangay"
                        value={form.barangay}
                        onChange={handleChange}
                        maxLength={150}
                        className={inputClass}
                        placeholder="Leave blank for all barangays"
                      />
                    </FormField>

                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    If the barangay is left blank, this rate applies to all
                    barangays in the selected municipality.
                  </p>
                </div>

                {/* SACK RANGE */}

                <div className="border-t border-slate-200 pt-5">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-900">
                    Sack Quantity Range
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">

                    <FormField label="Minimum Sacks" required>
                      <input
                        name="min_sacks"
                        type="number"
                        min="1"
                        step="1"
                        value={form.min_sacks}
                        onChange={handleChange}
                        required
                        className={inputClass}
                        placeholder="e.g. 1"
                      />
                    </FormField>

                    <FormField label="Maximum Sacks">
                      <input
                        name="max_sacks"
                        type="number"
                        min={form.min_sacks || "1"}
                        step="1"
                        value={form.max_sacks}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="Leave blank for no limit"
                      />
                    </FormField>

                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    Example: Minimum 1 and Maximum 5 means this rate applies
                    to orders containing 1 to 5 sacks.
                  </p>
                </div>

                {/* SHIPPING FEE */}

                <div className="border-t border-slate-200 pt-5">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-900">
                    Shipping Fee
                  </p>

                  <FormField label="Delivery Fee (PHP)" required>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                        ₱
                      </span>

                      <input
                        name="shipping_fee"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.shipping_fee}
                        onChange={handleChange}
                        required
                        className={`${inputClass} pl-8`}
                        placeholder="0.00"
                      />
                    </div>
                  </FormField>
                </div>

                {/* STATUS */}

                <div className="border-t border-slate-200 pt-5">
                  <FormField label="Status" required>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>

                {/* PREVIEW */}

                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-900">
                    Shipping Rate Preview
                  </p>

                  <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {form.municipality.trim() || "Municipality"}
                      </p>

                      <p className="mt-1 text-xs text-slate-600">
                        {form.barangay.trim() || "All Barangays"}
                      </p>

                      <p className="mt-1 text-xs text-blue-800">
                        {form.min_sacks || "1"} to{" "}
                        {form.max_sacks || "unlimited"} sacks
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-xs text-blue-700">
                        Delivery Fee
                      </p>

                      <p className="mt-1 text-xl font-bold text-blue-900">
                        {formatCurrency(form.shipping_fee)}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* MODAL FOOTER */}

              <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingRate
                      ? "Update Shipping Rate"
                      : "Save Shipping Rate"}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

    </main>
  );
}

// REUSABLE COMPONENTS

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-100";

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

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-3 text-2xl font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Active: "bg-green-50 text-green-700",
    Inactive: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status || "Unknown"}
    </span>
  );
}
