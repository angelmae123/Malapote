
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../providers";
import { apiRequest } from "../../../../lib/api";
import { toast } from "react-toastify";

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

const inputClass =
  "w-full rounded-xl border border-[#54ACBF]/30 bg-[#A7EBF2]/10 px-3.5 py-2.5 text-[12px] text-[#011C40] outline-none transition placeholder:text-[#26658C]/50 focus:border-[#26658C] focus:bg-white focus:ring-2 focus:ring-[#54ACBF]/15";

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
    return `${formatNumber(minimum)} ${
      minimum === 1 ? "sack" : "sacks"
    }`;
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

export default function ShippingRatesPage() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [shippingRates, setShippingRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // LOAD SHIPPING RATES

  const loadShippingRates = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await apiRequest(API_ENDPOINT, {
        token,
      });

      setShippingRates(getResponseData(response));
    } catch (err) {
      toast.error(err.message || "Unable to load shipping rates.");
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
  }

  function openAddModal() {
    resetForm();
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
      toast.error(validationError);
      return;
    }

    setSaving(true);

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

        toast.success("Shipping rate updated successfully.");
      } else {
        await apiRequest(API_ENDPOINT, {
          method: "POST",
          token,
          body: payload,
        });

        toast.success("Shipping rate added successfully.");
      }

      setModalOpen(false);
      resetForm();

      await loadShippingRates();
    } catch (err) {
      toast.error(err.message || "Unable to save shipping rate.");
    } finally {
      setSaving(false);
    }
  }

  // DELETE SHIPPING RATE

  async function handleDelete(rate) {
    const confirmed = window.confirm(
      `Are you sure you want to delete the shipping rate for ${getLocation(
        rate
      )}?`
    );

    if (!confirmed) return;

    try {
      await apiRequest(`${API_ENDPOINT}/${rate.id}`, {
        method: "DELETE",
        token,
      });

      toast.success("Shipping rate deleted successfully.");

      await loadShippingRates();
    } catch (err) {
      toast.error(err.message || "Unable to delete shipping rate.");
    }
  }

  // PAGE

  return (
    <main className="min-h-screen bg-[#F3F8FA] p-3 text-[#011C40] sm:p-5 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-5">

        {/* HEADER */}

        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-[9px] font-extrabold tracking-[1.5px] text-[#54ACBF]">
              SALES MANAGEMENT
            </p>

            <h1 className="font-serif text-xl tracking-tight text-[#011C40] sm:text-2xl">
              Shipping Rates
            </h1>

            <p className="mt-1 text-[12px] text-[#26658C]">
              Manage delivery fees based on destination and sack quantity.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="rounded-xl bg-[#023859] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#011C40]"
          >
            + Add Shipping Rate
          </button>
        </header>

        {/* SUMMARY */}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SummaryCard
            label="Active Shipping Rates"
            value={formatNumber(summary.active)}
            icon="✓"
          />

          <SummaryCard
            label="Covered Municipalities"
            value={formatNumber(summary.municipalities)}
            icon="⌖"
          />
        </section>

        {/* SUMMARY INFORMATION */}

        <section className="rounded-xl border border-[#54ACBF]/25 bg-[#A7EBF2]/15 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold text-[#023859]">
                Shipping Rate Overview
              </p>

              <p className="mt-1 text-[11px] text-[#26658C]">
                Monitor your configured delivery rates and their current status.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-[10px] text-[#26658C]">
                  Total Rates
                </p>
                <p className="text-base font-bold text-[#011C40]">
                  {formatNumber(summary.total)}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-[#26658C]">
                  Inactive Rates
                </p>
                <p className="text-base font-bold text-[#011C40]">
                  {formatNumber(summary.inactive)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SHIPPING RATES TABLE */}

        <section className="overflow-hidden rounded-2xl border border-[#54ACBF]/25 bg-white shadow-sm">

          <div className="flex flex-col gap-3 border-b border-[#A7EBF2]/50 p-4 sm:px-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-bold text-[#011C40]">
                Shipping Rate List
              </h2>

              <p className="mt-1 text-[11px] text-[#26658C]">
                Delivery fees configured per destination and sack range.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search destination..."
                className={`${inputClass} sm:w-52`}
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={`${inputClass} sm:w-36`}
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>

              <button
                type="button"
                onClick={loadShippingRates}
                disabled={loading}
                className="rounded-lg border border-[#54ACBF]/30 bg-[#A7EBF2]/20 px-3 py-2 text-[11px] font-semibold text-[#023859] transition hover:bg-[#A7EBF2]/50 disabled:opacity-50"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-[11px]">

              <thead className="bg-[#A7EBF2]/20 text-[10px] uppercase tracking-wider text-[#023859]">
                <tr>
                  <th className="px-5 py-3.5">Destination</th>
                  <th className="px-5 py-3.5">Minimum Sacks</th>
                  <th className="px-5 py-3.5">Maximum Sacks</th>
                  <th className="px-5 py-3.5">Sack Range</th>
                  <th className="px-5 py-3.5">Shipping Fee</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#A7EBF2]/30">

                {loading ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-5 py-12 text-center text-[#26658C]"
                    >
                      Loading shipping rates...
                    </td>
                  </tr>
                ) : filteredRates.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-5 py-12 text-center text-[#26658C]"
                    >
                      No shipping rates found.
                    </td>
                  </tr>
                ) : (
                  filteredRates.map((rate) => (
                    <tr
                      key={rate.id}
                      className="transition hover:bg-[#A7EBF2]/10"
                    >

                      {/* DESTINATION */}

                      <td className="px-5 py-3.5">
                        <p className="font-bold text-[#011C40]">
                          {rate.municipality}
                        </p>

                        <p className="mt-1 text-[10px] text-[#26658C]">
                          {rate.barangay || "All Barangays"}
                        </p>
                      </td>

                      {/* MINIMUM */}

                      <td className="px-5 py-3.5 text-[#26658C]">
                        {formatNumber(rate.min_sacks)}
                      </td>

                      {/* MAXIMUM */}

                      <td className="px-5 py-3.5 text-[#26658C]">
                        {rate.max_sacks === null ||
                        rate.max_sacks === undefined ||
                        rate.max_sacks === ""
                          ? "No limit"
                          : formatNumber(rate.max_sacks)}
                      </td>

                      {/* SACK RANGE */}

                      <td className="px-5 py-3.5">
                        <span className="inline-flex rounded-lg bg-[#A7EBF2]/30 px-2.5 py-1.5 text-[10px] font-bold text-[#023859]">
                          {getSackRange(rate)}
                        </span>
                      </td>

                      {/* SHIPPING FEE */}

                      <td className="px-5 py-3.5 font-bold text-[#011C40]">
                        {formatCurrency(rate.shipping_fee)}
                      </td>

                      {/* STATUS */}

                      <td className="px-5 py-3.5">
                        <StatusBadge status={getStatus(rate)} />
                      </td>

                      {/* ACTIONS */}

                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(rate)}
                            className="rounded-lg border border-[#54ACBF]/30 bg-[#A7EBF2]/20 px-3 py-1.5 text-[10px] font-semibold text-[#023859] transition hover:bg-[#A7EBF2]/60"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(rate)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[10px] font-semibold text-red-700 transition hover:bg-red-100"
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

          <div className="border-t border-[#A7EBF2]/40 bg-[#A7EBF2]/10 px-4 py-3 text-[10px] text-[#26658C]">
            Showing {filteredRates.length} of {shippingRates.length} shipping rates
          </div>
        </section>

        {/* INFORMATION */}

        <section className="rounded-xl border border-[#54ACBF]/25 bg-[#A7EBF2]/15 p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#A7EBF2]/40 text-base font-bold text-[#023859]">
              i
            </span>

            <div>
              <h3 className="text-[12px] font-bold text-[#023859]">
                How Shipping Rates Work
              </h3>

              <p className="mt-1 text-[11px] leading-5 text-[#26658C]">
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#011C40]/60 p-3 backdrop-blur-sm sm:p-5">

          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#54ACBF]/30 bg-white shadow-2xl">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-[#A7EBF2]/60 px-5 py-4 sm:px-6">
              <div>
                <p className="text-[9px] font-extrabold tracking-[1.5px] text-[#54ACBF]">
                  SALES MANAGEMENT
                </p>

                <h2 className="mt-1 text-lg font-bold text-[#011C40]">
                  {editingRate ? "Edit Shipping Rate" : "Add Shipping Rate"}
                </h2>

                <p className="mt-1 text-[11px] text-[#26658C]">
                  {editingRate
                    ? "Update the destination and delivery fee details."
                    : "Configure a new delivery fee for a destination."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#A7EBF2]/30 text-lg text-[#26658C] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">

                {/* DESTINATION */}

                <div>
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[#023859]">
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

                  <p className="mt-2 text-[10px] text-[#26658C]">
                    If the barangay is left blank, this rate applies to all
                    barangays in the selected municipality.
                  </p>
                </div>

                {/* SACK RANGE */}

                <div className="border-t border-[#A7EBF2]/50 pt-4">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[#023859]">
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

                  <p className="mt-2 text-[10px] text-[#26658C]">
                    Example: Minimum 1 and Maximum 5 means this rate applies
                    to orders containing 1 to 5 sacks.
                  </p>
                </div>

                {/* SHIPPING FEE */}

                <div className="border-t border-[#A7EBF2]/50 pt-4">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[#023859]">
                    Shipping Fee
                  </p>

                  <FormField label="Delivery Fee (PHP)" required>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[#26658C]">
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

                <div className="border-t border-[#A7EBF2]/50 pt-4">
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

                <div className="rounded-xl border border-[#54ACBF]/25 bg-[#A7EBF2]/15 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#023859]">
                    Shipping Rate Preview
                  </p>

                  <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-[12px] font-bold text-[#011C40]">
                        {form.municipality.trim() || "Municipality"}
                      </p>

                      <p className="mt-1 text-[10px] text-[#26658C]">
                        {form.barangay.trim() || "All Barangays"}
                      </p>

                      <p className="mt-1 text-[10px] text-[#26658C]">
                        {form.min_sacks || "1"} to{" "}
                        {form.max_sacks || "unlimited"} sacks
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-[10px] text-[#26658C]">
                        Delivery Fee
                      </p>

                      <p className="mt-1 text-xl font-bold text-[#023859]">
                        {formatCurrency(form.shipping_fee)}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* MODAL FOOTER */}

              <div className="flex justify-end gap-2 border-t border-[#A7EBF2]/50 bg-white px-5 py-4 sm:px-6">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-[#54ACBF]/40 bg-white px-4 py-2.5 text-[11px] font-semibold text-[#26658C] transition hover:bg-[#A7EBF2]/20 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#023859] px-5 py-2.5 text-[11px] font-semibold text-white transition hover:bg-[#011C40] disabled:cursor-not-allowed disabled:opacity-60"
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

function FormField({ label, required, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#023859]">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children}
    </div>
  );
}

function SummaryCard({ label, value, icon }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#54ACBF]/25 bg-white p-4 shadow-sm">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#A7EBF2]/40 text-lg font-bold text-[#023859]">
        {icon}
      </div>

      <div>
        <p className="text-[11px] font-medium text-[#26658C]">
          {label}
        </p>

        <p className="mt-0.5 text-xl font-bold text-[#011C40]">
          {value}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const isActive = status === "Active";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${
        isActive
          ? "bg-[#A7EBF2]/40 text-[#023859]"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {status || "Unknown"}
    </span>
  );
}
