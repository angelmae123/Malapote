
"use client";

import { useCallback, useEffect, useState } from "react";
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
  milling_id: "",
  drying_record_id: "",
  milling_date: today(),
  dried_input_kg: "",
  sacks_50kg: "0",
  sacks_25kg: "0",
  loose_rice_kg: "0",
  bran_kg: "0",
  broken_rice_kg: "0",
  status: "Completed",
};

export default function Milling() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [records, setRecords] = useState([]);
  const [dryings, setDryings] = useState([]);
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
      const [millingResponse, dryingResponse] = await Promise.all([
        apiRequest("mill/milling", { token }),
        apiRequest("mill/drying", { token }),
      ]);

      setRecords(rows(millingResponse));
      setDryings(rows(dryingResponse));
    } catch (e) {
      toast.error(e.message || "Unable to load milling data.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = dryings.find(
    (d) => String(d.id) === String(form.drying_record_id)
  );

  const existing = records.find(
    (r) => String(r.id) === String(editing)
  );

  const currentRemaining = selected
    ? Number(selected.remaining_dried_kg || 0) +
      (
        editing !== null &&
        String(selected.id) === String(existing?.drying_record_id) &&
        existing?.status !== "Cancelled"
          ? Number(existing?.dried_input_kg || 0)
          : 0
      )
    : 0;

  const input = Number(form.dried_input_kg || 0);

  const sacks50 = Number(form.sacks_50kg || 0);
  const sacks25 = Number(form.sacks_25kg || 0);
  const looseRice = Number(form.loose_rice_kg || 0);

  // Rice output is calculated from the actual sack counts.
  const rice = sacks50 * 50 + sacks25 * 25 + looseRice;

  const bran = Number(form.bran_kg || 0);
  const broken = Number(form.broken_rice_kg || 0);

  const recovery = input > 0 ? (rice / input) * 100 : 0;

  const openAdd = () => {
    setEditing(null);
    setForm({ ...blank, milling_id: code("MILL") });
    toast.error("Unable to process this request right now. Please try again.");
    toast.success("Action completed successfully.");
    setModal(true);
  };

  const openEdit = (r) => {
    setEditing(r.id);

    setForm({
      milling_id: r.milling_id || "",
      drying_record_id: String(r.drying_record_id || ""),
      milling_date: r.milling_date
        ? String(r.milling_date).slice(0, 10)
        : today(),
      dried_input_kg: String(r.dried_input_kg ?? ""),
      sacks_50kg: String(r.sacks_50kg ?? "0"),
      sacks_25kg: String(r.sacks_25kg ?? "0"),
      loose_rice_kg: String(r.loose_rice_kg ?? "0"),
      bran_kg: String(r.bran_kg ?? "0"),
      broken_rice_kg: String(r.broken_rice_kg ?? "0"),
      status: r.status || "Completed",
    });

    toast.error("Unable to process this request right now. Please try again.");
    toast.success("Action completed successfully.");
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
    toast.error("Unable to process this request right now. Please try again.");

    if (!selected) {
      toast.error("Select a completed drying batch.");
      return;
    }

    if (
      !Number.isFinite(input) ||
      input <= 0 ||
      input > currentRemaining
    ) {
      toast.error(
        `Dried input must be greater than zero and cannot exceed the remaining ${qty(currentRemaining)} kg.`
      );
      return;
    }

    const validSackCounts =
      Number.isInteger(sacks50) &&
      Number.isInteger(sacks25) &&
      sacks50 >= 0 &&
      sacks25 >= 0;

    if (!validSackCounts) {
      toast.error(
        "The 50 kg and 25 kg sack counts must be non-negative whole numbers."
      );
      return;
    }

    if (
      !Number.isFinite(looseRice) ||
      looseRice < 0 ||
      !Number.isFinite(rice) ||
      !Number.isFinite(bran) ||
      !Number.isFinite(broken) ||
      bran < 0 ||
      broken < 0 ||
      rice + bran + broken > input
    ) {
      toast.error(
        "Rice, bran, and broken rice outputs must be non-negative and their total cannot exceed dried input."
      );
      return;
    }

    try {
      setSaving(true);

      const body = {
        milling_id: form.milling_id,
        drying_record_id: Number(form.drying_record_id),
        batch_code: selected.batch_code,
        milling_date: form.milling_date || null,
        dried_input_kg: input,

        // Send actual sack counts and loose rice.
        // The backend must calculate rice_output_kg independently.
        sacks_50kg: sacks50,
        sacks_25kg: sacks25,
        loose_rice_kg: looseRice,

        bran_kg: bran,
        broken_rice_kg: broken,
        status: form.status,
      };

      await apiRequest(
        editing !== null
          ? `mill/milling/${editing}`
          : "mill/milling",
        {
          method: editing !== null ? "PUT" : "POST",
          token,
          body,
        }
      );

      toast.success(
        editing !== null
          ? "Milling session updated."
          : "Milling session created. Inventory is synced automatically when status is Completed."
      );

      setModal(false);
      setEditing(null);
      await load();
    } catch (e) {
      toast.error(e.message || "Unable to save milling session.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(r) {
    if (
      !window.confirm(
        `Delete milling session ${r.milling_id}? Generated inventory will also be removed if it has not been consumed.`
      )
    ) {
      return;
    }

    try {
      toast.error("Unable to process this request right now. Please try again.");

      await apiRequest(`mill/milling/${r.id}`, {
        method: "DELETE",
        token,
      });

      toast.success("Milling session deleted.");
      await load();
    } catch (e) {
      toast.error(e.message || "Unable to delete milling session.");
    }
  }

  const eligible = dryings.filter(
    (d) =>
      d.status === "Completed" &&
      (
        Number(d.remaining_dried_kg || 0) > 0 ||
        String(d.id) === String(form.drying_record_id)
      )
  );

  const displayedVariety = selected?.variety || existing?.variety || "";

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
              Rice Mill Management
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Milling Records
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              One drying batch can have multiple milling sessions.
            </p>
          </div>

          <button
            onClick={openAdd}
            className="rounded-xl bg-blue-800 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            + Add Milling Session
          </button>
        </header>

        <Notice error={error} success={success} />

        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex justify-between border-b p-5">
            <div>
              <h2 className="font-semibold">Milling Sessions</h2>
              <p className="text-sm text-slate-500">
                {records.length} record(s)
              </p>
            </div>

            <button
              onClick={load}
              disabled={loading}
              className="text-sm font-semibold text-blue-800 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-275 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {[
                    "Milling Code",
                    "Drying Batch",
                    "Variety",
                    "Date",
                    "Input kg",
                    "50 kg Sacks",
                    "25 kg Sacks",
                    "Loose kg",
                    "Rice kg",
                    "Bran kg",
                    "Broken Rice kg",
                    "Recovery",
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
                    <td colSpan="14" className="p-10 text-center">
                      Loading...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td
                      colSpan="14"
                      className="p-10 text-center text-slate-500"
                    >
                      No milling sessions yet.
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold">
                        {r.milling_id}
                      </td>

                      <td className="px-4 py-3">
                        {r.drying_id || r.batch_code || "—"}
                      </td>

                      <td className="px-4 py-3">
                        {r.variety || "—"}
                      </td>

                      <td className="px-4 py-3">
                        {dateOnly(r.milling_date)}
                      </td>

                      <td className="px-4 py-3">
                        {qty(r.dried_input_kg)}
                      </td>

                      <td className="px-4 py-3">
                        {Number(r.sacks_50kg || 0)}
                      </td>

                      <td className="px-4 py-3">
                        {Number(r.sacks_25kg || 0)}
                      </td>

                      <td className="px-4 py-3">
                        {qty(r.loose_rice_kg)}
                      </td>

                      <td className="px-4 py-3 font-semibold">
                        {qty(r.rice_output_kg)}
                      </td>

                      <td className="px-4 py-3">
                        {qty(r.bran_kg)}
                      </td>

                      <td className="px-4 py-3">
                        {qty(r.broken_rice_kg)}
                      </td>

                      <td className="px-4 py-3">
                        {qty(
                          r.recovery_rate
                            ? String(r.recovery_rate).replace("%", "")
                            : (
                                Number(r.rice_output_kg || 0) /
                                Math.max(
                                  Number(r.dried_input_kg || 0),
                                  1
                                )
                              ) * 100
                        )}%
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
              ? "Edit Milling Session"
              : "Add Milling Session"
          }
          onClose={close}
          saving={saving}
        >
          <form onSubmit={submit} className="space-y-5 p-6">
            <Notice error={error} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Milling Code">
                <input
                  className={inputClass}
                  value={form.milling_id}
                  disabled
                />
              </Field>

              <Field label="Completed Drying Batch *">
                <select
                  className={inputClass}
                  name="drying_record_id"
                  value={form.drying_record_id}
                  onChange={change}
                  required
                >
                  <option value="">
                    Select completed drying batch
                  </option>

                  {eligible.map((d) => {
                    const available =
                      Number(d.remaining_dried_kg || 0) +
                      (
                        editing !== null &&
                        String(d.id) === String(existing?.drying_record_id) &&
                        existing?.status !== "Cancelled"
                          ? Number(existing?.dried_input_kg || 0)
                          : 0
                      );

                    return (
                      <option key={d.id} value={d.id}>
                        {d.drying_id} — {d.batch_code} —{" "}
                        {d.variety || "No variety"} (remaining{" "}
                        {qty(available)} kg)
                      </option>
                    );
                  })}
                </select>
              </Field>

              <Field label="Batch Code">
                <input
                  className={inputClass}
                  value={selected?.batch_code || existing?.batch_code || ""}
                  disabled
                />
              </Field>

              <Field label="Rice Variety">
                <input
                  className={inputClass}
                  value={displayedVariety}
                  disabled
                  placeholder="Select a drying batch first"
                />
              </Field>

              <Field label="Milling Date">
                <input
                  className={inputClass}
                  type="date"
                  name="milling_date"
                  value={form.milling_date}
                  onChange={change}
                />
              </Field>

              <Field label="Dried Input (kg) *">
                <input
                  className={inputClass}
                  type="number"
                  min="0.01"
                  max={currentRemaining || undefined}
                  step="0.01"
                  name="dried_input_kg"
                  value={form.dried_input_kg}
                  onChange={change}
                  required
                />

                <span className="mt-1 block text-xs text-slate-500">
                  Available for this session: {qty(currentRemaining)} kg
                </span>
              </Field>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
              <div className="mb-4">
                <h3 className="font-bold text-slate-900">
                  Milled Rice Packaging
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="50 kg Sacks">
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    step="1"
                    name="sacks_50kg"
                    value={form.sacks_50kg}
                    onChange={change}
                  />

                  <span className="mt-1 block text-xs text-slate-500">
                    {qty(sacks50 * 50)} kg total
                  </span>
                </Field>

                <Field label="25 kg Sacks">
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    step="1"
                    name="sacks_25kg"
                    value={form.sacks_25kg}
                    onChange={change}
                  />

                  <span className="mt-1 block text-xs text-slate-500">
                    {qty(sacks25 * 25)} kg total
                  </span>
                </Field>

                <Field label="Loose Rice (kg)">
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    step="0.01"
                    name="loose_rice_kg"
                    value={form.loose_rice_kg}
                    onChange={change}
                  />

                  <span className="mt-1 block text-xs text-slate-500">
                    Rice na hindi napuno sa sack
                  </span>
                </Field>
              </div>

              <div className="mt-4 rounded-xl bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-800">
                  Computed Rice Output
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {qty(rice)} kg
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  ({sacks50} × 50 kg) + ({sacks25} × 25 kg) +{" "}
                  {qty(looseRice)} kg loose rice
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Rice Bran (kg)">
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.01"
                  name="bran_kg"
                  value={form.bran_kg}
                  onChange={change}
                />
              </Field>

              <Field label="Broken Rice (kg)">
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.01"
                  name="broken_rice_kg"
                  value={form.broken_rice_kg}
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
                  <option>Completed</option>
                  <option>In Progress</option>
                  <option>Pending</option>
                  <option>Cancelled</option>
                </select>
              </Field>
            </div>

            <div className="grid gap-3 rounded-xl bg-blue-50 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-blue-700">
                  Total outputs
                </p>

                <b className="text-lg">
                  {qty(rice + bran + broken)} kg
                </b>
              </div>

              <div>
                <p className="text-xs text-blue-700">
                  Rice recovery
                </p>

                <b className="text-lg">
                  {qty(recovery)}%
                </b>
              </div>

              <div>
                <p className="text-xs text-blue-700">
                  Remaining after this session
                </p>

                <b className="text-lg">
                  {qty(Math.max(0, currentRemaining - input))} kg
                </b>
              </div>
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
                disabled={saving || eligible.length === 0}
                className="rounded-xl bg-blue-800 px-6 py-2.5 font-semibold text-white disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editing !== null
                    ? "Update Session"
                    : "Save Session"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}
