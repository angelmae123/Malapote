
"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../providers";
import { apiRequest } from "../../../../lib/api";

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

const qty = (v) =>
  Number(v || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4"
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
  drying_id: "",
  palay_purchasing_id: "",
  start_date: today(),
  end_date: "",
  start_weight_kg: "",
  final_weight_kg: "0",
  drying_cost: "0",
  status: "In Progress",
};

export default function Drying() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [records, setRecords] = useState([]);
  const [purchases, setPurchases] = useState([]);
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
      setError("Session expired. Please sign in again.");
      return;
    }

    try {
      setError("");

      const [d, p] = await Promise.all([
        apiRequest("mill/drying", { token }),
        apiRequest("mill/purchasing", { token }),
      ]);

      setRecords(rows(d));
      setPurchases(rows(p));
    } catch (e) {
      setError(
        e.message || "Unable to load drying and purchase records."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = purchases.find(
    (p) => String(p.id) === String(form.palay_purchasing_id)
  );

  const currentRecord = records.find(
    (r) => String(r.id) === String(editing)
  );

  const start = Number(form.start_weight_kg || 0);
  const final = Number(form.final_weight_kg || 0);

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...blank,
      drying_id: code("DRY"),
    });
    setError("");
    setSuccess("");
    setModal(true);
  };

  const openEdit = (r) => {
    setEditing(r.id);

    setForm({
      drying_id: r.drying_id || "",
      palay_purchasing_id: String(r.palay_purchasing_id || ""),
      start_date: r.start_date
        ? String(r.start_date).slice(0, 10)
        : "",
      end_date: r.end_date
        ? String(r.end_date).slice(0, 10)
        : "",
      start_weight_kg: String(r.start_weight_kg ?? ""),
      final_weight_kg: String(r.final_weight_kg ?? "0"),
      drying_cost: String(r.drying_cost ?? "0"),
      status: r.status || "In Progress",
    });

    setError("");
    setSuccess("");
    setModal(true);
  };

  const change = (e) => {
    setForm((p) => ({
      ...p,
      [e.target.name]: e.target.value,
    }));
  };

  const close = () => {
    if (!saving) {
      setModal(false);
      setEditing(null);
    }
  };

  async function submit(e) {
    e.preventDefault();
    setError("");

    const dryingCost = Number(form.drying_cost || 0);

    if (!form.palay_purchasing_id) {
      setError("Select a purchase record.");
      return;
    }

    if (
      !Number.isFinite(start) ||
      start <= 0 ||
      !Number.isFinite(final) ||
      final < 0 ||
      final > start
    ) {
      setError(
        "Starting weight must be positive and final weight must be between zero and starting weight."
      );
      return;
    }

    if (!Number.isFinite(dryingCost) || dryingCost < 0) {
      setError("Drying cost cannot be negative.");
      return;
    }

    if (
      form.end_date &&
      form.start_date &&
      form.end_date < form.start_date
    ) {
      setError("End date cannot be earlier than start date.");
      return;
    }

    if (form.status === "Completed" && final <= 0) {
      setError("Enter the final dried weight before completing drying.");
      return;
    }

    if (
      selected?.quantity_kg &&
      start > Number(selected.quantity_kg)
    ) {
      setError(
        "Starting weight cannot exceed the purchased quantity."
      );
      return;
    }

    try {
      setSaving(true);

      const body = {
        drying_id: form.drying_id,
        palay_purchasing_id: Number(form.palay_purchasing_id),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        start_weight_kg: start,
        final_weight_kg: final,
        drying_cost: dryingCost,
        status: form.status,
      };

      await apiRequest(
        editing !== null
          ? `mill/drying/${editing}`
          : "mill/drying",
        {
          method: editing !== null ? "PUT" : "POST",
          token,
          body,
        }
      );

      setSuccess(
        editing !== null
          ? "Drying record updated."
          : "Drying record created."
      );

      setModal(false);
      setEditing(null);

      await load();
    } catch (e) {
      setError(e.message || "Unable to save drying record.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(r) {
    if (
      !window.confirm(
        `Delete drying record ${r.drying_id}?`
      )
    ) {
      return;
    }

    try {
      setError("");

      await apiRequest(`mill/drying/${r.id}`, {
        method: "DELETE",
        token,
      });

      setSuccess("Drying record deleted.");
      await load();
    } catch (e) {
      setError(
        e.message ||
          "Cannot delete a drying record already used in milling."
      );
    }
  }

  const availablePurchases = purchases.filter(
    (p) =>
      !Number(p.has_drying) ||
      String(p.id) === String(form.palay_purchasing_id)
  );

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
              Rice Mill Management
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Drying Records
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              One drying record is linked to one purchase batch.
            </p>
          </div>

          <button
            onClick={openAdd}
            className="rounded-xl bg-blue-800 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            + Add Drying
          </button>
        </header>

        <Notice error={error} success={success} />

        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex justify-between border-b p-5">
            <div>
              <h2 className="font-semibold">Drying Batches</h2>
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
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {[
                    "Drying Code",
                    "Purchase Batch",
                    "Rice Variety",
                    "Supplier",
                    "Start Weight",
                    "Final Weight",
                    "Remaining for Milling",
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
                    <td colSpan="9" className="p-10 text-center">
                      Loading...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="p-10 text-center text-slate-500"
                    >
                      No drying records yet.
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold">
                        {r.drying_id}
                      </td>

                      <td className="px-4 py-3">
                        {r.batch_code || "—"}
                      </td>

                      <td className="px-4 py-3 font-medium text-blue-800">
                        {r.variety || "—"}
                      </td>

                      <td className="px-4 py-3">
                        {r.supplier_name || "—"}
                      </td>

                      <td className="px-4 py-3">
                        {qty(r.start_weight_kg)} kg
                      </td>

                      <td className="px-4 py-3">
                        {qty(r.final_weight_kg)} kg
                      </td>

                      <td className="px-4 py-3 font-semibold text-blue-800">
                        {qty(r.remaining_dried_kg)} kg
                      </td>

                      <td className="px-4 py-3">
                        {r.status}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(r)}
                            className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => remove(r)}
                            className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"
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
            editing !== null
              ? "Edit Drying Record"
              : "Add Drying Record"
          }
          onClose={close}
          saving={saving}
        >
          <form onSubmit={submit} className="space-y-5 p-6">
            <Notice error={error} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Drying Code">
                <input
                  className={inputClass}
                  value={form.drying_id}
                  disabled
                />
              </Field>

              <Field label="Purchase Batch *">
                <select
                  className={inputClass}
                  name="palay_purchasing_id"
                  value={form.palay_purchasing_id}
                  onChange={change}
                  disabled={editing !== null}
                  required
                >
                  <option value="">Select purchase batch</option>

                  {availablePurchases.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.batch_code} — {p.supplier_name} (
                      {qty(p.quantity_kg)} kg)
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Rice Variety">
                <input
                  className={inputClass}
                  value={
                    selected?.variety ||
                    currentRecord?.variety ||
                    ""
                  }
                  disabled
                  placeholder="Automatically from purchase record"
                />
              </Field>

              <Field label="Supplier">
                <input
                  className={inputClass}
                  value={
                    selected?.supplier_name ||
                    currentRecord?.supplier_name ||
                    ""
                  }
                  disabled
                  placeholder="Select a purchase first"
                />
              </Field>

              <Field label="Purchased Quantity (kg)">
                <input
                  className={inputClass}
                  value={
                    selected
                      ? qty(selected.quantity_kg)
                      : currentRecord
                        ? qty(currentRecord.purchased_quantity_kg)
                        : ""
                  }
                  disabled
                />
              </Field>

              <Field label="Start Date">
                <input
                  className={inputClass}
                  type="date"
                  name="start_date"
                  value={form.start_date}
                  onChange={change}
                />
              </Field>

              <Field label="End Date">
                <input
                  className={inputClass}
                  type="date"
                  min={form.start_date || undefined}
                  name="end_date"
                  value={form.end_date}
                  onChange={change}
                />
              </Field>

              <Field label="Starting Weight (kg) *">
                <input
                  className={inputClass}
                  type="number"
                  min="0.01"
                  max={
                    selected?.quantity_kg ||
                    currentRecord?.purchased_quantity_kg ||
                    undefined
                  }
                  step="0.01"
                  name="start_weight_kg"
                  value={form.start_weight_kg}
                  onChange={change}
                  required
                />
              </Field>

              <Field label="Final Dried Weight (kg)">
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  max={form.start_weight_kg || undefined}
                  step="0.01"
                  name="final_weight_kg"
                  value={form.final_weight_kg}
                  onChange={change}
                />
              </Field>

              <Field label="Drying Cost (₱)">
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.01"
                  name="drying_cost"
                  value={form.drying_cost}
                  onChange={change}
                />
              </Field>

              <Field label="Status">
                <select
                  className={inputClass}
                  name="status"
                  value={form.status}
                  onChange={change}
                >
                  <option>In Progress</option>
                  <option>Completed</option>
                  <option>Pending</option>
                </select>
              </Field>
            </div>

            <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
              Weight loss: <b>{qty(start - final)} kg</b>.

              {selected && (
                <>
                  {" "}
                  Purchase batch quantity:{" "}
                  <b>{qty(selected.quantity_kg)} kg</b>.
                </>
              )}
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
                disabled={
                  saving ||
                  (!editing && availablePurchases.length === 0)
                }
                className="rounded-xl bg-blue-800 px-6 py-2.5 font-semibold text-white disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editing !== null
                    ? "Update Drying"
                    : "Save Drying"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}
