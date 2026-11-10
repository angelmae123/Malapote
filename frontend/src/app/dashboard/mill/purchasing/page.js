"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../providers";
import { apiRequest } from "../../../../lib/api";
import { toast } from "react-toastify";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100";

const labelClass =
  "mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600";

const today = () => new Date().toISOString().slice(0, 10);

const code = (prefix) =>
  `${prefix}-${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}`;

const rows = (r) => {
  if (Array.isArray(r)) return r;
  if (Array.isArray(r?.data)) return r.data;
  if (Array.isArray(r?.data?.data)) return r.data.data;
  if (Array.isArray(r?.records)) return r.records;
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

function Notice({ error, success }) {
  return (
    <>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
          {success}
        </div>
      )}
    </>
  );
}

function Modal({ title, onClose, saving, children }) {
  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4"
      onMouseDown={(e) =>
        e.target === e.currentTarget && !saving && onClose()
      }
    >
      <section
        role="dialog"
        aria-modal="true"
        className="my-auto max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>

          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-2xl text-slate-400 hover:bg-slate-100"
          >
            ×
          </button>
        </div>

        {children}
      </section>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
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

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      toast.error("Session expired. Please sign in again.");
      return;
    }

    try {
      setRecords(rows(await apiRequest("mill/purchasing", { token })));
    } catch (e) {
      toast.error(e.message || "Unable to load purchase records.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const total = useMemo(
    () =>
      Number(form.quantity_kg || 0) *
      Number(form.price_per_kg || 0),
    [form.quantity_kg, form.price_per_kg]
  );

  const change = (e) => {
    setForm((p) => ({
      ...p,
      [e.target.name]: e.target.value,
    }));
  };

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...blank,
      batch_code: code("PALAY"),
    });
    toast.error("Unable to process this request right now. Please try again.");
    toast.success("Action completed successfully.");
    setModal(true);
  };

  const openEdit = (r) => {
    setEditing(r.id);

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

    toast.error("Unable to process this request right now. Please try again.");
    toast.success("Action completed successfully.");
    setModal(true);
  };

  const close = () => {
    if (!saving) {
      setModal(false);
      setEditing(null);
    }
  };

  async function submit(e) {
    e.preventDefault();
    toast.error("Unable to process this request right now. Please try again.");

    const q = Number(form.quantity_kg);
    const p = Number(form.price_per_kg);

    if (
      !form.batch_code.trim() ||
      !form.variety.trim() ||
      !form.supplier_name.trim()
    ) {
      toast.error(
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
      toast.error(
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

      await load();
    } catch (e) {
      toast.error(e.message || "Unable to save purchase record.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(r) {
    if (!window.confirm(`Delete purchase ${r.batch_code}?`)) {
      return;
    }

    try {
      toast.error("Unable to process this request right now. Please try again.");

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
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
              Rice Mill Management
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Palay Purchasing
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Record each supplier purchase as a separate batch.
            </p>
          </div>

          <button
            onClick={openAdd}
            className="rounded-xl bg-blue-800 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + Add Purchase
          </button>
        </header>

        <Notice error={error} success={success} />

        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-5">
            <div>
              <h2 className="font-semibold">Purchase Records</h2>
              <p className="text-sm text-slate-500">
                {records.length} record(s)
              </p>
            </div>

            <button
              onClick={load}
              disabled={loading}
              className="text-sm font-semibold text-blue-800"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-237.5 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
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
                    <th key={x} className="px-4 py-3">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan="10" className="p-10 text-center">
                      Loading...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td
                      colSpan="10"
                      className="p-10 text-center text-slate-500"
                    >
                      No purchase records yet.
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold">
                        {r.batch_code}
                      </td>

                      <td className="px-4 py-3 font-medium text-blue-800">
                        {r.variety || "—"}
                      </td>

                      <td className="px-4 py-3">
                        {r.supplier_name}
                      </td>

                      <td className="px-4 py-3">
                        {dateOnly(r.purchase_date)}
                      </td>

                      <td className="px-4 py-3">
                        {qty(r.quantity_kg)} kg
                      </td>

                      <td className="px-4 py-3">
                        {money(r.price_per_kg)}
                      </td>

                      <td className="px-4 py-3 font-semibold">
                        {money(r.total_amount)}
                      </td>

                      <td className="px-4 py-3">
                        {r.payment_status}
                      </td>

                      <td className="px-4 py-3">
                        {r.status}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(r)}
                            className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => remove(r)}
                            className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
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
        </section>
      </div>

      {modal && (
        <Modal
          title={
            editing !== null ? "Edit Purchase" : "Add Purchase"
          }
          onClose={close}
          saving={saving}
        >
          <form onSubmit={submit} className="space-y-5 p-6">
            <Notice error={error} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Batch Code *">
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

              <Field label="Rice Variety *">
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

              <Field label="Supplier Name *">
                <input
                  className={inputClass}
                  name="supplier_name"
                  value={form.supplier_name}
                  onChange={change}
                  required
                  maxLength="150"
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

              <Field label="Quantity (kg) *">
                <input
                  className={inputClass}
                  type="number"
                  min="0.01"
                  step="0.01"
                  name="quantity_kg"
                  value={form.quantity_kg}
                  onChange={change}
                  required
                />
              </Field>

              <Field label="Price per kg (₱) *">
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.01"
                  name="price_per_kg"
                  value={form.price_per_kg}
                  onChange={change}
                  required
                />
              </Field>

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

            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                Computed total purchase amount
              </p>

              <p className="text-2xl font-bold text-blue-950">
                {money(total)}
              </p>

              <p className="text-xs text-blue-700">
                Quantity × Price per kg
              </p>
            </div>

            <div className="flex justify-end gap-3 border-t pt-4">
              <button
                type="button"
                onClick={close}
                disabled={saving}
                className="rounded-xl border px-5 py-2.5"
              >
                Cancel
              </button>

              <button
                disabled={saving}
                className="rounded-xl bg-blue-800 px-6 py-2.5 font-semibold text-white disabled:opacity-50"
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
