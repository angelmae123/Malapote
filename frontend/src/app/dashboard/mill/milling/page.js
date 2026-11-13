
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../providers";
import { apiRequest } from "../../../../lib/api";
import { toast } from "react-toastify";

const COLORS = {
  light: "#A7EBF2",
  teal: "#54ACBF",
  blue: "#26658C",
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

const dateOnly = (v) => (v ? String(v).slice(0, 10) : "—");

const getStatusStyle = (status) => {
  switch (status) {
    case "Completed":
      return "border-[#A7EBF2] bg-[#E8FAFC] text-[#023859]";
    case "In Progress":
      return "border-[#54ACBF]/40 bg-[#A7EBF2]/30 text-[#023859]";
    case "Pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "Cancelled":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
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
              Manage milling details and production outputs.
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

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [millingResponse, dryingResponse] = await Promise.all([
        apiRequest("mill/milling", { token }),
        apiRequest("mill/drying", { token }),
      ]);

      setRecords(rows(millingResponse));
      setDryings(rows(dryingResponse));
      setError("");
    } catch (e) {
      toast.error(e.message || "Unable to load milling data.");
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
      dryings.find(
        (d) => String(d.id) === String(form.drying_record_id)
      ),
    [dryings, form.drying_record_id]
  );

  const existing = useMemo(
    () => records.find((r) => String(r.id) === String(editing)),
    [records, editing]
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

  const rice = sacks50 * 50 + sacks25 * 25 + looseRice;

  const bran = Number(form.bran_kg || 0);
  const broken = Number(form.broken_rice_kg || 0);

  const recovery = input > 0 ? (rice / input) * 100 : 0;

  const totalRiceOutput = records.reduce(
    (sum, r) => sum + Number(r.rice_output_kg || 0),
    0
  );

  const totalBran = records.reduce(
    (sum, r) => sum + Number(r.bran_kg || 0),
    0
  );

  const totalBroken = records.reduce(
    (sum, r) => sum + Number(r.broken_rice_kg || 0),
    0
  );

  const completedCount = records.filter(
    (r) => r.status === "Completed"
  ).length;

  const inProgressCount = records.filter(
    (r) => r.status === "In Progress"
  ).length;

  const eligibleDryingCount = dryings.filter(
    (d) =>
      d.status === "Completed" &&
      Number(d.remaining_dried_kg || 0) > 0
  ).length;

  const openAdd = () => {
    setEditing(null);
    setError("");
    setForm({
      ...blank,
      milling_id: code("MILL"),
      milling_date: today(),
    });
    setModal(true);
  };

  const openEdit = (r) => {
    setEditing(r.id);
    setError("");

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

    if (!selected) {
      setError("Select a completed drying batch.");
      return;
    }

    if (
      !Number.isFinite(input) ||
      input <= 0 ||
      input > currentRemaining
    ) {
      setError(
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
      setError(
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
      setError(
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
      setError(e.message || "Unable to save milling session.");
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

  const displayedVariety =
    selected?.variety || existing?.variety || "";

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
            Add Milling Session
          </button>
        </header>

        {/* SUMMARY CARDS */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SummaryCard
            title="Total Milled Rice Output"
            value={`${qty(totalRiceOutput)} kg`}
            description="Combined rice production from all sessions"
            icon="🌾"
          />

          <SummaryCard
            title="Total Byproducts"
            value={`${qty(totalBran + totalBroken)} kg`}
            description={`${qty(totalBran)} kg bran · ${qty(totalBroken)} kg broken rice`}
            icon="▤"
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
                Milling and Inventory Management
              </h2>

              <p className="mt-1 text-[11px] leading-relaxed text-[#26658C]">
                Only completed drying batches can be milled. One drying batch
                may have multiple milling sessions. Completed milling sessions
                automatically synchronize their production outputs with Mill
                Inventory.
              </p>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#54ACBF]/20 pt-3">
                <p className="text-[11px] text-[#26658C]">
                  Total Sessions:{" "}
                  <span className="font-bold text-[#011C40]">
                    {records.length}
                  </span>
                </p>

                <p className="text-[11px] text-[#26658C]">
                  Completed:{" "}
                  <span className="font-bold text-[#023859]">
                    {completedCount}
                  </span>
                </p>

                <p className="text-[11px] text-[#26658C]">
                  In Progress:{" "}
                  <span className="font-bold text-[#26658C]">
                    {inProgressCount}
                  </span>
                </p>

                <p className="text-[11px] text-[#26658C]">
                  Eligible Drying Batches:{" "}
                  <span className="font-bold text-[#023859]">
                    {eligibleDryingCount}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* MILLING TABLE */}
        <section className="overflow-hidden rounded-2xl border border-[#54ACBF]/25 bg-white shadow-sm">

          {/* TABLE HEADER */}
          <div className="flex flex-col justify-between gap-3 border-b border-[#A7EBF2]/50 p-4 sm:flex-row sm:items-center sm:px-5">
            <div>
              <h2 className="text-base font-bold text-[#011C40]">
                Milling Sessions
              </h2>

              <p className="mt-1 text-[11px] text-[#26658C]">
                View and manage recorded milling operations.
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
            <table className="w-full min-w-[1200px] text-left text-[11px]">
              <thead className="bg-[#A7EBF2]/20 text-[10px] uppercase tracking-wider text-[#023859]">
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
                    <td colSpan="14" className="p-10 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#A7EBF2]/40 border-t-[#26658C]" />

                        <p className="text-[11px] text-[#26658C]">
                          Loading milling records...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan="14">
                      <div className="flex flex-col items-center px-5 py-12 text-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#A7EBF2]/30 text-2xl">
                          🌾
                        </div>

                        <p className="text-sm font-bold text-[#023859]">
                          No milling sessions yet
                        </p>

                        <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                          Start by adding a milling session from a completed
                          drying batch.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr
                      key={r.id}
                      className="transition hover:bg-[#A7EBF2]/10"
                    >
                      <td className="whitespace-nowrap px-4 py-3.5 font-bold text-[#023859]">
                        {r.milling_id}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-medium text-[#26658C]">
                        {r.drying_id || r.batch_code || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                        {r.variety || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                        {dateOnly(r.milling_date)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-[#011C40]">
                        {qty(r.dried_input_kg)}
                      </td>

                      <td className="px-4 py-3.5 text-center tabular-nums">
                        {Number(r.sacks_50kg || 0)}
                      </td>

                      <td className="px-4 py-3.5 text-center tabular-nums">
                        {Number(r.sacks_25kg || 0)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 tabular-nums">
                        {qty(r.loose_rice_kg)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-bold text-[#023859]">
                        {qty(r.rice_output_kg)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                        {qty(r.bran_kg)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                        {qty(r.broken_rice_kg)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-[#26658C]">
                        {qty(
                          r.recovery_rate !== null &&
                            r.recovery_rate !== undefined &&
                            r.recovery_rate !== ""
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

                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold ${getStatusStyle(r.status)}`}
                        >
                          {r.status || "Unknown"}
                        </span>
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
                Showing {records.length} milling session(s)
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
              ? "Edit Milling Session"
              : "Add Milling Session"
          }
          onClose={close}
          saving={saving}
        >
          <form
            onSubmit={submit}
            className="flex min-h-0 flex-1 flex-col"
          >
            {/* SCROLLABLE FORM CONTENT */}
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
              <Notice error={error} />

              {/* MILLING INFORMATION */}
              <div>
                <div className="mb-3">
                  <h3 className="text-[12px] font-bold text-[#023859]">
                    Milling Information
                  </h3>

                  <p className="mt-0.5 text-[11px] text-[#26658C]">
                    Enter the details of the drying batch and milling operation.
                  </p>
                </div>

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
                            String(d.id) ===
                              String(existing?.drying_record_id) &&
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
                      value={
                        selected?.batch_code ||
                        existing?.batch_code ||
                        ""
                      }
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

                    <span className="mt-1 block text-[10px] text-[#26658C]">
                      Available for this session:{" "}
                      {qty(currentRemaining)} kg
                    </span>
                  </Field>
                </div>
              </div>

              <div className="border-t border-[#A7EBF2]/50" />

              {/* RICE PACKAGING */}
              <div className="rounded-xl border border-[#54ACBF]/25 bg-[#A7EBF2]/15 p-4">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-lg text-[#023859] shadow-sm">
                    🌾
                  </div>

                  <div>
                    <h3 className="text-[12px] font-bold text-[#023859]">
                      Milled Rice Packaging
                    </h3>

                    <p className="mt-0.5 text-[11px] text-[#26658C]">
                      Record the number of sacks and remaining loose rice.
                    </p>
                  </div>
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

                    <span className="mt-1 block text-[10px] font-medium text-[#26658C]">
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

                    <span className="mt-1 block text-[10px] font-medium text-[#26658C]">
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

                    <span className="mt-1 block text-[10px] font-medium text-[#26658C]">
                      Rice not packed in sacks
                    </span>
                  </Field>
                </div>

                <div className="mt-4 rounded-xl border border-[#54ACBF]/25 bg-white p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[#26658C]">
                        Computed Rice Output
                      </p>

                      <p className="mt-0.5 text-[10px] text-slate-500">
                        Based on actual sack counts and loose rice
                      </p>
                    </div>

                    <p className="text-xl font-bold text-[#011C40]">
                      {qty(rice)}{" "}
                      <span className="text-xs font-semibold text-slate-500">
                        kg
                      </span>
                    </p>
                  </div>

                  <div className="mt-3 rounded-lg bg-[#A7EBF2]/20 px-3 py-2 text-[10px] text-[#26658C]">
                    ({sacks50} × 50 kg) + ({sacks25} × 25 kg) +{" "}
                    {qty(looseRice)} kg loose rice
                  </div>
                </div>
              </div>

              {/* OTHER OUTPUTS */}
              <div>
                <div className="mb-3">
                  <h3 className="text-[12px] font-bold text-[#023859]">
                    Other Production Outputs
                  </h3>

                  <p className="mt-0.5 text-[11px] text-[#26658C]">
                    Record the bran and broken rice produced during milling.
                  </p>
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
              </div>

              {/* PRODUCTION SUMMARY */}
              <div className="rounded-xl border border-[#54ACBF]/25 bg-[#A7EBF2]/15 p-4">
                <h3 className="text-[12px] font-bold text-[#023859]">
                  Production Summary
                </h3>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-[10px] font-medium text-[#26658C]">
                      Total Outputs
                    </p>

                    <p className="mt-1 text-base font-bold text-[#011C40]">
                      {qty(rice + bran + broken)} kg
                    </p>
                  </div>

                  <div className="rounded-lg bg-white p-3">
                    <p className="text-[10px] font-medium text-[#26658C]">
                      Rice Recovery
                    </p>

                    <p className="mt-1 text-base font-bold text-[#26658C]">
                      {qty(recovery)}%
                    </p>
                  </div>

                  <div className="rounded-lg bg-white p-3">
                    <p className="text-[10px] font-medium text-[#26658C]">
                      Remaining After Session
                    </p>

                    <p className="mt-1 text-base font-bold text-[#023859]">
                      {qty(Math.max(0, currentRemaining - input))} kg
                    </p>
                  </div>
                </div>
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
                disabled={saving || eligible.length === 0}
                className="rounded-xl bg-[#023859] px-6 py-2.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#011C40] disabled:cursor-not-allowed disabled:opacity-50"
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
