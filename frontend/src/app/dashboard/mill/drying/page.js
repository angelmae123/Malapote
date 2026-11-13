
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
  "w-full rounded-xl border border-[#54ACBF]/30 bg-[#A7EBF2]/10 px-3.5 py-2.5 text-[12px] text-[#011C40] outline-none transition placeholder:text-slate-400 focus:border-[#26658C] focus:bg-white focus:ring-2 focus:ring-[#54ACBF]/15 disabled:bg-slate-100 disabled:text-slate-500";

const labelClass =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#023859]";

const today = () => {
  const date = new Date();
  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );

  return localDate.toISOString().slice(0, 10);
};

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
  return [];
};

const qty = (v) =>
  Number(v || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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

function Notice({ error }) {
  if (!error) return null;

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
      {error}
    </div>
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
        {/* MODAL HEADER */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#A7EBF2]/60 px-5 py-4 sm:px-6">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[1.5px] text-[#54ACBF]">
              Rice Mill Management
            </p>

            <h2 className="mt-1 text-lg font-bold text-[#011C40]">
              {title}
            </h2>

            <p className="mt-0.5 text-[11px] text-[#26658C]">
              Manage your palay drying record and weight details.
            </p>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#A7EBF2]/30 text-xl text-[#26658C] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
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

function SummaryCard({ title, value, description, icon }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#54ACBF]/25 bg-white p-4 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A7EBF2]/40 text-lg text-[#023859]">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-medium text-[#26658C]">
          {title}
        </p>

        <p className="mt-0.5 text-xl font-bold text-[#011C40]">
          {value}
        </p>

        <p className="mt-0.5 text-[10px] text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Completed: "border-[#A7EBF2] bg-[#E8FAFC] text-[#023859]",
    "In Progress": "border-[#B8D5E0] bg-[#EDF6FA] text-[#26658C]",
    Pending: "border-amber-200 bg-amber-50 text-amber-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
        styles[status] || "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "Completed"
            ? "bg-[#54ACBF]"
            : status === "Pending"
              ? "bg-amber-500"
              : "bg-[#26658C]"
        }`}
      />

      {status || "Unknown"}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center px-5 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#A7EBF2]/30 text-2xl">
        🌾
      </div>

      <p className="text-sm font-bold text-[#023859]">
        No drying records yet
      </p>

      <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
        Add a drying record to start managing your drying batches.
      </p>
    </div>
  );
}

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

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [d, p] = await Promise.all([
        apiRequest("mill/drying", { token }),
        apiRequest("mill/purchasing", { token }),
      ]);

      setRecords(rows(d));
      setPurchases(rows(p));
      setError("");
    } catch (e) {
      toast.error(
        e.message || "Unable to load drying and purchase records."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      load();
    } else {
      setLoading(false);
    }
  }, [token, load]);

  const selected = useMemo(
    () =>
      purchases.find(
        (p) => String(p.id) === String(form.palay_purchasing_id)
      ),
    [purchases, form.palay_purchasing_id]
  );

  const currentRecord = useMemo(
    () => records.find((r) => String(r.id) === String(editing)),
    [records, editing]
  );

  const start = Number(form.start_weight_kg || 0);
  const final = Number(form.final_weight_kg || 0);

  const summary = useMemo(() => {
    const totalStarting = records.reduce(
      (sum, r) => sum + Number(r.start_weight_kg || 0),
      0
    );

    const totalFinal = records.reduce(
      (sum, r) => sum + Number(r.final_weight_kg || 0),
      0
    );

    return {
      total: records.length,
      completed: records.filter(
        (r) => r.status === "Completed"
      ).length,
      inProgress: records.filter(
        (r) => r.status === "In Progress"
      ).length,
      totalStarting,
      totalFinal,
    };
  }, [records]);

  const openAdd = () => {
    setEditing(null);
    setError("");

    setForm({
      ...blank,
      drying_id: code("DRY"),
      start_date: today(),
    });

    setModal(true);
  };

  const openEdit = (r) => {
    setEditing(r.id);
    setError("");

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

    setModal(true);
  };

  const change = (e) => {
    const { name, value } = e.target;

    setForm((p) => ({
      ...p,
      [name]: value,
    }));

    setError("");
  };

  const close = () => {
    if (!saving) {
      setModal(false);
      setEditing(null);
      setError("");
    }
  };

  async function submit(e) {
    e.preventDefault();
    setError("");

    const dryingCost = Number(form.drying_cost || 0);

    if (!form.palay_purchasing_id) {
      setError("Please select a purchase record.");
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

    const purchasedQuantity = Number(
      selected?.quantity_kg ??
        currentRecord?.purchased_quantity_kg ??
        0
    );

    if (purchasedQuantity > 0 && start > purchasedQuantity) {
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

      toast.success(
        editing !== null
          ? "Drying record updated."
          : "Drying record created."
      );

      setModal(false);
      setEditing(null);

      await load();
    } catch (e) {
      setError(e.message || "Unable to save drying record.");
      toast.error(e.message || "Unable to save drying record.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(r) {
    if (!window.confirm(`Delete drying record ${r.drying_id}?`)) {
      return;
    }

    try {
      await apiRequest(`mill/drying/${r.id}`, {
        method: "DELETE",
        token,
      });

      toast.success("Drying record deleted.");
      await load();
    } catch (e) {
      toast.error(
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
    <main className="min-h-screen bg-[#F3F8FA] p-3 text-[#011C40] sm:p-5 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-5">

        {/* PAGE HEADER */}
        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#023859] px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#011C40] focus:outline-none focus:ring-2 focus:ring-[#54ACBF] focus:ring-offset-2"
          >
            <span className="text-base leading-none">+</span>
            Add Drying
          </button>
        </header>

        {/* SUMMARY CARDS */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SummaryCard
            title="Total Starting Weight"
            value={`${qty(summary.totalStarting)} kg`}
            description="Combined starting weight of all batches"
            icon="⚖"
          />

          <SummaryCard
            title="Total Dried Weight"
            value={`${qty(summary.totalFinal)} kg`}
            description="Combined final dried weight"
            icon="🌾"
          />
        </section>

        {/* INFORMATION PANEL */}
        <section className="rounded-xl border border-[#54ACBF]/25 bg-[#A7EBF2]/15 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-base text-[#023859] shadow-sm">
              ℹ
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-[12px] font-bold text-[#023859]">
                Drying Management Overview
              </h2>

              <p className="mt-1 text-[11px] leading-relaxed text-[#26658C]">
                Each purchase batch can only have one drying record.
                The starting weight must not exceed the purchased quantity.
                Only completed drying batches should proceed to milling.
              </p>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#54ACBF]/20 pt-3">
                <p className="text-[11px] text-[#26658C]">
                  Total Records:{" "}
                  <span className="font-bold text-[#011C40]">
                    {summary.total}
                  </span>
                </p>

                <p className="text-[11px] text-[#26658C]">
                  Completed:{" "}
                  <span className="font-bold text-[#023859]">
                    {summary.completed}
                  </span>
                </p>

                <p className="text-[11px] text-[#26658C]">
                  In Progress:{" "}
                  <span className="font-bold text-[#26658C]">
                    {summary.inProgress}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* DRYING TABLE */}
        <section className="overflow-hidden rounded-2xl border border-[#54ACBF]/25 bg-white shadow-sm">
          {/* TABLE HEADER */}
          <div className="flex flex-col justify-between gap-3 border-b border-[#A7EBF2]/50 p-4 sm:flex-row sm:items-center sm:px-5">
            <div>
              <h2 className="text-base font-bold text-[#011C40]">
                Drying Batches
              </h2>

              <p className="mt-1 text-[11px] text-[#26658C]">
                View and manage all recorded drying batches.
              </p>
            </div>

            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#54ACBF]/30 bg-[#A7EBF2]/20 px-3 py-2 text-[11px] font-semibold text-[#023859] transition hover:bg-[#A7EBF2]/50 disabled:opacity-50"
            >
              <span>↻</span>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {/* TABLE CONTENT */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-[11px]">
              <thead className="bg-[#A7EBF2]/20 text-[10px] uppercase tracking-wider text-[#023859]">
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
                    <th
                      key={x}
                      className="whitespace-nowrap px-4 py-3 font-bold"
                    >
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#A7EBF2]/30">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="p-10 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#A7EBF2]/40 border-t-[#26658C]" />

                        <p className="text-[11px] text-[#26658C]">
                          Loading drying records...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan="9">
                      <EmptyState />
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr
                      key={r.id}
                      className="transition hover:bg-[#A7EBF2]/10"
                    >
                      <td className="whitespace-nowrap px-4 py-3.5 font-bold text-[#023859]">
                        {r.drying_id}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-medium text-[#26658C]">
                        {r.batch_code || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-[#26658C]">
                        {r.variety || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                        {r.supplier_name || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-[#011C40]">
                        {qty(r.start_weight_kg)} kg
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-[#011C40]">
                        {qty(r.final_weight_kg)} kg
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-bold text-[#023859]">
                        {qty(r.remaining_dried_kg)} kg
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5">
                        <StatusBadge status={r.status} />
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="rounded-lg border border-[#54ACBF]/30 bg-[#A7EBF2]/20 px-3 py-1.5 text-[10px] font-semibold text-[#023859] transition hover:bg-[#A7EBF2]/60"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => remove(r)}
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

          {/* TABLE FOOTER */}
          {!loading && records.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#A7EBF2]/40 bg-[#A7EBF2]/10 px-4 py-3 text-[10px] text-slate-500">
              <span>
                Showing {records.length} drying record(s)
              </span>

              <span className="font-semibold text-[#26658C]">
                Rice Mill Management
              </span>
            </div>
          )}
        </section>
      </div>

      {/* ADD / EDIT MODAL */}
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
          <form
            onSubmit={submit}
            className="flex min-h-0 flex-1 flex-col"
          >
            {/* SCROLLABLE FORM CONTENT */}
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
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
                    placeholder="Automatically from purchase record"
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

              {/* WEIGHT SUMMARY */}
              <div className="rounded-xl border border-[#54ACBF]/25 bg-[#A7EBF2]/15 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-[12px] font-bold text-[#023859]">
                    Weight Summary
                  </h3>

                  <StatusBadge status={form.status} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#26658C]">
                      Weight Loss
                    </p>

                    <p className="mt-1 text-lg font-bold text-[#011C40]">
                      {qty(Math.max(0, start - final))} kg
                    </p>
                  </div>

                  <div className="rounded-lg bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#26658C]">
                      Final Dried Weight
                    </p>

                    <p className="mt-1 text-lg font-bold text-[#011C40]">
                      {qty(final)} kg
                    </p>
                  </div>
                </div>

                {selected && (
                  <p className="mt-3 border-t border-[#54ACBF]/20 pt-3 text-[10px] text-[#26658C]">
                    Purchase batch quantity:{" "}
                    <b className="text-[#023859]">
                      {qty(selected.quantity_kg)} kg
                    </b>
                  </p>
                )}
              </div>
            </div>

            {/* FIXED FORM FOOTER */}
            <div className="flex shrink-0 flex-col-reverse justify-end gap-2 border-t border-[#A7EBF2]/50 bg-white px-5 py-4 sm:flex-row sm:px-6">
              <button
                type="button"
                onClick={close}
                disabled={saving}
                className="rounded-xl border border-[#54ACBF]/30 px-5 py-2.5 text-[12px] font-semibold text-[#26658C] transition hover:bg-[#A7EBF2]/20 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  saving ||
                  (!editing && availablePurchases.length === 0)
                }
                className="rounded-xl bg-[#023859] px-6 py-2.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#011C40] disabled:cursor-not-allowed disabled:opacity-50"
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
