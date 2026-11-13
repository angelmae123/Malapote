
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../providers";
import { apiRequest } from "../../../../lib/api";
import { toast } from "react-toastify";

const COLORS = {
  light: "#A7EBF2",
  teal: "#54ACBF",
  medium: "#26658C",
  deep: "#023859",
  navy: "#011C40",
};

const inputClass =
  "w-full rounded-xl border border-[#54ACBF]/30 bg-[#A7EBF2]/10 px-3.5 py-2.5 text-[12px] text-[#011C40] outline-none transition placeholder:text-[#26658C]/50 focus:border-[#26658C] focus:bg-white focus:ring-2 focus:ring-[#54ACBF]/15 disabled:cursor-not-allowed disabled:bg-slate-100";

const labelClass =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#023859]";

const today = () => new Date().toISOString().slice(0, 10);

const code = (prefix) =>
  `${prefix}-${new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14)}`;

const rows = (r) => {
  if (Array.isArray(r)) return r;
  if (Array.isArray(r?.data)) return r.data;
  if (Array.isArray(r?.data?.data)) return r.data.data;
  if (Array.isArray(r?.records)) return r.records;
  if (Array.isArray(r?.data?.records)) return r.data.records;
  return [];
};

const money = (v) =>
  Number(v || 0).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
  });

const qty = (v) =>
  Number(v || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const dateOnly = (v) => (v ? String(v).slice(0, 10) : "—");

const getPaymentStyle = (status) => {
  const value = String(status || "").toLowerCase();

  if (value === "paid") {
    return "border border-[#54ACBF]/40 bg-[#A7EBF2]/30 text-[#023859]";
  }

  if (value === "partial") {
    return "border border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border border-red-200 bg-red-50 text-red-700";
};

const getStatusStyle = (status) => {
  const value = String(status || "").toLowerCase();

  if (value === "completed") {
    return "border border-[#54ACBF]/40 bg-[#A7EBF2]/30 text-[#023859]";
  }

  return "border border-amber-200 bg-amber-50 text-amber-700";
};

function Notice({ error, success }) {
  return (
    <>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[11px] font-medium text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-[#54ACBF]/30 bg-[#A7EBF2]/20 px-4 py-3 text-[11px] font-medium text-[#023859]">
          {success}
        </div>
      )}
    </>
  );
}

function Modal({ title, onClose, saving, children }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#011C40]/60 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(e) =>
        e.target === e.currentTarget && !saving && onClose()
      }
    >
      <section
        role="dialog"
        aria-modal="true"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#54ACBF]/30 bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#A7EBF2]/60 px-5 py-4 sm:px-6">
          <div>
            <p className="text-[9px] font-extrabold tracking-[1.5px] text-[#54ACBF]">
              AGRISTOCK · RICE MILL
            </p>

            <h2 className="mt-1 text-lg font-bold text-[#011C40]">
              {title}
            </h2>

            <p className="mt-1 text-[11px] text-[#26658C]">
              Enter the palay purchase information below.
            </p>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            aria-label="Close modal"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#A7EBF2]/30 text-lg text-[#26658C] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {children}
      </section>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function SummaryCard({ title, value, icon }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#54ACBF]/25 bg-white p-4 shadow-sm">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#A7EBF2]/40 text-lg font-bold text-[#023859]">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-medium text-[#26658C]">
          {title}
        </p>

        <p className="mt-0.5 break-words text-xl font-bold text-[#011C40]">
          {value}
        </p>
      </div>
    </div>
  );
}

const blank = {
  batch_code: "",
  variety: "",
  supplier_name: "",
  purchase_date: today(),
  quantity_kg: "",
  price_per_kg: "",
  payment_status: "Unpaid",
  status: "Completed",
};

export default function PalayPurchasing() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(blank);

  const [editing, setEditing] = useState(null);
  const [modal, setModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // LOAD PURCHASE RECORDS

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await apiRequest("mill/purchasing", { token });
      setRecords(rows(response));
    } catch (e) {
      toast.error(e.message || "Unable to load purchase records.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      load();
    }
  }, [token, load]);

  // PURCHASE TOTAL

  const total = useMemo(
    () =>
      Number(form.quantity_kg || 0) *
      Number(form.price_per_kg || 0),
    [form.quantity_kg, form.price_per_kg]
  );

  // SUMMARY

  const summary = useMemo(() => {
    const totalQuantity = records.reduce(
      (sum, r) => sum + Number(r.quantity_kg || 0),
      0
    );

    const totalAmount = records.reduce(
      (sum, r) => sum + Number(r.total_amount || 0),
      0
    );

    const completed = records.filter(
      (r) => String(r.status).toLowerCase() === "completed"
    ).length;

    const unpaid = records.filter(
      (r) => String(r.payment_status).toLowerCase() !== "paid"
    ).length;

    return {
      totalQuantity,
      totalAmount,
      completed,
      unpaid,
    };
  }, [records]);

  // FORM HANDLING

  const change = (e) => {
    const { name, value } = e.target;

    setForm((p) => ({
      ...p,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  function openAdd() {
    setEditing(null);
    setError("");
    setSuccess("");

    setForm({
      ...blank,
      batch_code: code("PALAY"),
    });

    setModal(true);
  }

  function openEdit(r) {
    setEditing(r.id);
    setError("");
    setSuccess("");

    setForm({
      batch_code: r.batch_code || "",
      variety: r.variety || "",
      supplier_name: r.supplier_name || "",
      purchase_date:
        dateOnly(r.purchase_date) === "—"
          ? today()
          : dateOnly(r.purchase_date),
      quantity_kg: String(r.quantity_kg ?? ""),
      price_per_kg: String(r.price_per_kg ?? ""),
      payment_status: r.payment_status || "Unpaid",
      status: r.status || "Pending",
    });

    setModal(true);
  }

  function close() {
    if (!saving) {
      setModal(false);
      setEditing(null);
      setError("");
      setSuccess("");
    }
  }

  // SAVE PURCHASE

  async function submit(e) {
    e.preventDefault();

    setError("");
    setSuccess("");

    const q = Number(form.quantity_kg);
    const p = Number(form.price_per_kg);

    if (
      !form.batch_code.trim() ||
      !form.variety.trim() ||
      !form.supplier_name.trim()
    ) {
      setError(
        "Batch code, rice variety, and supplier name are required."
      );
      return;
    }

    if (
      !Number.isFinite(q) ||
      q <= 0 ||
      !Number.isFinite(p) ||
      p < 0
    ) {
      setError(
        "Quantity must be greater than zero and price cannot be negative."
      );
      return;
    }

    try {
      setSaving(true);

      const body = {
        batch_code: form.batch_code.trim(),
        variety: form.variety.trim(),
        supplier_name: form.supplier_name.trim(),
        purchase_date: form.purchase_date,
        quantity_kg: q,
        price_per_kg: p,
        total_amount: Number((q * p).toFixed(2)),
        payment_status: form.payment_status,
        status: form.status,
      };

      await apiRequest(
        editing !== null
          ? `mill/purchasing/${editing}`
          : "mill/purchasing",
        {
          method: editing !== null ? "PUT" : "POST",
          token,
          body,
        }
      );

      toast.success(
        editing !== null
          ? "Purchase record updated."
          : "Purchase record added."
      );

      setModal(false);
      setEditing(null);
      setError("");

      await load();
    } catch (e) {
      setError(e.message || "Unable to save purchase record.");
      toast.error(e.message || "Unable to save purchase record.");
    } finally {
      setSaving(false);
    }
  }

  // DELETE PURCHASE

  async function remove(r) {
    if (!window.confirm(`Delete purchase ${r.batch_code}?`)) {
      return;
    }

    try {
      await apiRequest(`mill/purchasing/${r.id}`, {
        method: "DELETE",
        token,
      });

      toast.success("Purchase record deleted.");
      await load();
    } catch (e) {
      toast.error(
        e.message ||
          "Unable to delete purchase. It may already be linked to drying."
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#F3F8FA] p-3 text-[#011C40] sm:p-5 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-5">

        {/* PAGE HEADER */}

        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={openAdd}
            className="rounded-xl bg-[#023859] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#011C40]"
          >
            + Add Purchase
          </button>
        </header>

        <Notice error={error && !modal ? error : ""} success={success} />

        {/* SUMMARY CARDS */}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SummaryCard
            title="Total Palay Purchased"
            value={`${qty(summary.totalQuantity)} kg`}
            icon="🌾"
          />

          <SummaryCard
            title="Total Purchase Cost"
            value={money(summary.totalAmount)}
            icon="₱"
          />
        </section>

        {/* PURCHASE OVERVIEW */}

        <section className="rounded-xl border border-[#54ACBF]/25 bg-[#A7EBF2]/15 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[11px] font-bold text-[#023859]">
                Purchase Overview
              </h2>

              <p className="mt-1 text-[11px] text-[#26658C]">
                Summary of recorded purchase batches and payment status.
              </p>
            </div>

            <div className="flex flex-wrap gap-5">
              <div>
                <p className="text-[10px] text-[#26658C]">
                  Total Purchases
                </p>
                <p className="text-base font-bold text-[#011C40]">
                  {records.length.toLocaleString("en-PH")}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-[#26658C]">
                  Completed
                </p>
                <p className="text-base font-bold text-[#011C40]">
                  {summary.completed.toLocaleString("en-PH")}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-[#26658C]">
                  Unpaid / Partial
                </p>
                <p className="text-base font-bold text-[#011C40]">
                  {summary.unpaid.toLocaleString("en-PH")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PURCHASE RECORDS */}

        <section className="overflow-hidden rounded-2xl border border-[#54ACBF]/25 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#A7EBF2]/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-base font-bold text-[#011C40]">
                Purchase Records
              </h2>

              <p className="mt-1 text-[11px] text-[#26658C]">
                Manage your recorded palay purchases and supplier transactions.
              </p>
            </div>

            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="rounded-lg border border-[#54ACBF]/30 bg-[#A7EBF2]/20 px-3 py-2 text-[11px] font-semibold text-[#023859] transition hover:bg-[#A7EBF2]/50 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-[11px]">
              <thead className="bg-[#A7EBF2]/20 text-[10px] uppercase tracking-wider text-[#023859]">
                <tr>
                  {[
                    "Batch",
                    "Variety",
                    "Supplier",
                    "Date",
                    "Quantity",
                    "Price/kg",
                    "Total",
                    "Payment",
                    "Status",
                    "Actions",
                  ].map((x) => (
                    <th
                      key={x}
                      className="whitespace-nowrap px-4 py-3.5"
                    >
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#A7EBF2]/30">
                {loading ? (
                  <tr>
                    <td
                      colSpan="10"
                      className="px-5 py-12 text-center text-[#26658C]"
                    >
                      Loading purchase records...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td
                      colSpan="10"
                      className="px-5 py-12 text-center text-[#26658C]"
                    >
                      No purchase records found. Add your first palay purchase
                      to get started.
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr
                      key={r.id}
                      className="transition hover:bg-[#A7EBF2]/10"
                    >
                      <td className="whitespace-nowrap px-4 py-3.5 font-bold text-[#023859]">
                        {r.batch_code}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-[#26658C]">
                        {r.variety || "—"}
                      </td>

                      <td className="px-4 py-3.5 text-[#26658C]">
                        {r.supplier_name || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-[#26658C]">
                        {dateOnly(r.purchase_date)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-medium text-[#011C40] tabular-nums">
                        {qty(r.quantity_kg)} kg
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-[#26658C] tabular-nums">
                        {money(r.price_per_kg)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-bold text-[#023859] tabular-nums">
                        {money(r.total_amount)}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${getPaymentStyle(
                            r.payment_status
                          )}`}
                        >
                          {r.payment_status || "Unpaid"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${getStatusStyle(
                            r.status
                          )}`}
                        >
                          {r.status || "Pending"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="rounded-lg border border-[#54ACBF]/30 bg-[#A7EBF2]/20 px-2.5 py-1.5 text-[10px] font-semibold text-[#023859] transition hover:bg-[#A7EBF2]/60"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => remove(r)}
                            className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[10px] font-semibold text-red-700 transition hover:bg-red-100"
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

          <div className="border-t border-[#A7EBF2]/40 bg-[#A7EBF2]/10 px-4 py-3">
            <p className="text-[10px] text-[#26658C]">
              Showing {records.length} purchase record(s).
            </p>
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
                Purchase Batch Management
              </h3>

              <p className="mt-1 text-[11px] leading-5 text-[#26658C]">
                Each supplier purchase is recorded as a separate batch.
                Completed purchases can proceed to the drying workflow.
                Make sure the batch code and rice variety are correct before
                saving the purchase record.
              </p>
            </div>
          </div>
        </section>

      </div>

      {/* ADD / EDIT MODAL */}

      {modal && (
        <Modal
          title={editing !== null ? "Edit Purchase" : "Add Purchase"}
          onClose={close}
          saving={saving}
        >
          <form
            onSubmit={submit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
              <Notice error={error} />

              {/* PURCHASE INFORMATION */}

              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[#023859]">
                  Purchase Information
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Batch Code" required>
                    <input
                      className={inputClass}
                      name="batch_code"
                      value={form.batch_code}
                      onChange={change}
                      required
                      maxLength="50"
                      placeholder="PALAY-2026-001"
                    />
                  </Field>

                  <Field label="Rice Variety" required>
                    <input
                      className={inputClass}
                      name="variety"
                      value={form.variety}
                      onChange={change}
                      required
                      maxLength="100"
                      placeholder="e.g. NSIC Rc 222"
                    />
                  </Field>

                  <Field label="Supplier Name" required>
                    <input
                      className={inputClass}
                      name="supplier_name"
                      value={form.supplier_name}
                      onChange={change}
                      required
                      maxLength="150"
                      placeholder="Enter supplier name"
                    />
                  </Field>

                  <Field label="Purchase Date">
                    <input
                      className={inputClass}
                      type="date"
                      name="purchase_date"
                      value={form.purchase_date}
                      onChange={change}
                    />
                  </Field>
                </div>
              </div>

              {/* QUANTITY AND PRICING */}

              <div className="border-t border-[#A7EBF2]/50 pt-4">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[#023859]">
                  Quantity and Pricing
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Quantity (kg)" required>
                    <input
                      className={inputClass}
                      type="number"
                      min="0.01"
                      step="0.01"
                      name="quantity_kg"
                      value={form.quantity_kg}
                      onChange={change}
                      required
                      placeholder="Enter quantity"
                    />
                  </Field>

                  <Field label="Price per kg (₱)" required>
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      step="0.01"
                      name="price_per_kg"
                      value={form.price_per_kg}
                      onChange={change}
                      required
                      placeholder="Enter price per kg"
                    />
                  </Field>
                </div>
              </div>

              {/* PAYMENT AND STATUS */}

              <div className="border-t border-[#A7EBF2]/50 pt-4">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[#023859]">
                  Payment and Purchase Status
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Payment Status">
                    <select
                      className={inputClass}
                      name="payment_status"
                      value={form.payment_status}
                      onChange={change}
                    >
                      <option>Unpaid</option>
                      <option>Partial</option>
                      <option>Paid</option>
                    </select>
                  </Field>

                  <Field label="Purchase Status">
                    <select
                      className={inputClass}
                      name="status"
                      value={form.status}
                      onChange={change}
                    >
                      <option>Pending</option>
                      <option>Completed</option>
                    </select>
                  </Field>
                </div>
              </div>

              {/* PURCHASE TOTAL */}

              <div className="rounded-xl border border-[#54ACBF]/25 bg-[#A7EBF2]/15 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#023859]">
                  Computed Total Purchase Amount
                </p>

                <div className="mt-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xl font-bold text-[#011C40]">
                      {money(total)}
                    </p>

                    <p className="mt-1 text-[10px] text-[#26658C]">
                      Quantity × Price per kg
                    </p>
                  </div>

                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#A7EBF2]/40 text-lg font-bold text-[#023859]">
                    ₱
                  </div>
                </div>
              </div>
            </div>

            {/* MODAL FOOTER */}

            <div className="flex shrink-0 flex-col-reverse justify-end gap-2 border-t border-[#A7EBF2]/50 bg-white px-5 py-4 sm:flex-row sm:px-6">
              <button
                type="button"
                onClick={close}
                disabled={saving}
                className="rounded-xl border border-[#54ACBF]/40 bg-white px-4 py-2.5 text-[11px] font-semibold text-[#26658C] transition hover:bg-[#A7EBF2]/20 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#023859] px-5 py-2.5 text-[11px] font-semibold text-white transition hover:bg-[#011C40] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editing !== null
                    ? "Update Purchase"
                    : "Save Purchase"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}
