
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../providers";
import { apiRequest } from "../../../../lib/api";
import { toast } from "react-toastify";

const generatePayrollCode = () =>
  `PAY-${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}`;

const EMPTY_FORM = {
  payroll_id: "",
  farmers_workers_id: "",
  worker_name: "",
  employment_type: "Daily",
  rate: "0",
  days: "0",
  advance: "0",
  status: "Pending",
};

const STATUS_OPTIONS = ["Pending", "Released"];

const inputClass =
  "w-full rounded-xl border border-[#54ACBF]/30 bg-[#A7EBF2]/10 px-3.5 py-2.5 text-[12px] text-[#011C40] outline-none transition placeholder:text-[#26658C]/50 focus:border-[#26658C] focus:bg-white focus:ring-2 focus:ring-[#54ACBF]/15";

function getResponseData(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
}

function getResponseObject(response) {
  if (response?.data?.data && !Array.isArray(response.data.data)) {
    return response.data.data;
  }

  if (response?.data && !Array.isArray(response.data)) {
    return response.data;
  }

  return response;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
  });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-PH", {
    maximumFractionDigits: 2,
  });
}

function calculateGross(rate, days) {
  return Number(rate || 0) * Number(days || 0);
}

function calculateNet(rate, days, advance) {
  return calculateGross(rate, days) - Number(advance || 0);
}

function formatPeriod(month, year) {
  if (!month || !year) return "Unknown Period";

  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
    "en-PH",
    {
      month: "long",
      year: "numeric",
    }
  );
}

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

function StatusBadge({ status }) {
  const styles = {
    Released: "border-[#54ACBF]/30 bg-[#A7EBF2]/40 text-[#023859]",
    Pending: "border-amber-200 bg-amber-50 text-amber-700",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${
        styles[status] || "border-slate-200 bg-slate-100 text-slate-600"
      }`}
    >
      {status || "—"}
    </span>
  );
}

function PeriodBadge({ status }) {
  const styles =
    status === "Open"
      ? "border-[#54ACBF]/30 bg-[#A7EBF2]/40 text-[#023859]"
      : status === "Closed"
        ? "border-slate-200 bg-slate-100 text-slate-600"
        : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${styles}`}
    >
      {status || "Unassigned"}
    </span>
  );
}

function SummaryCard({ label, value, description, icon }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-[#54ACBF]/25 bg-white p-4 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A7EBF2]/40 text-[#023859]">
        <span className="text-lg">{icon}</span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-[#26658C]">{label}</p>
        <p className="mt-0.5 truncate text-xl font-bold text-[#011C40]">
          {value}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-[#26658C]/70">
          {description}
        </p>
      </div>
    </div>
  );
}

function BreakdownItem({ label, value, valueClass = "text-[#011C40]" }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#26658C]">
        {label}
      </p>
      <p className={`mt-1 truncate text-sm font-bold ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

export default function PayrollPage() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [records, setRecords] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [currentPeriod, setCurrentPeriod] = useState(null);

  const [selectedPeriodId, setSelectedPeriodId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // =========================================================
  // LOAD PAYROLL DATA
  // =========================================================

  const loadData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const currentPeriodResponse = await apiRequest(
        "office/payroll-current-period",
        { token }
      );

      const current = getResponseObject(currentPeriodResponse);

      if (!current?.id) {
        throw new Error("Unable to retrieve the current payroll period.");
      }

      const [payrollResponse, workersResponse, periodsResponse] =
        await Promise.all([
          apiRequest("office/payroll", { token }),
          apiRequest("office/farmers-workers", { token }),
          apiRequest("office/payroll-periods", { token }),
        ]);

      const payrollData = getResponseData(payrollResponse);
      const workerData = getResponseData(workersResponse);
      const periodData = getResponseData(periodsResponse);

      setRecords(payrollData);
      setWorkers(workerData);
      setCurrentPeriod(current);
      setPeriods(periodData);

      setSelectedPeriodId((previous) => {
        if (
          previous === "unassigned" &&
          payrollData.some((record) => !record.payroll_period_id)
        ) {
          return previous;
        }

        const existingPeriod = periodData.find(
          (period) => String(period.id) === String(previous)
        );

        if (existingPeriod) {
          return String(existingPeriod.id);
        }

        return String(current.id);
      });
    } catch (err) {
      toast.error(err.message || "Unable to load payroll records.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // =========================================================
  // SELECTED PERIOD
  // =========================================================

  const selectedPeriod = useMemo(() => {
    if (selectedPeriodId === "unassigned") return null;

    return (
      periods.find(
        (period) => String(period.id) === String(selectedPeriodId)
      ) || null
    );
  }, [periods, selectedPeriodId]);

  const isUnassignedView = selectedPeriodId === "unassigned";

  const isCurrentPeriodSelected =
    Boolean(currentPeriod?.id) &&
    String(selectedPeriodId) === String(currentPeriod.id);

  const canAddPayroll =
    isCurrentPeriodSelected && currentPeriod?.status === "Open";

  const hasUnassignedRecords = records.some(
    (record) => !record.payroll_period_id
  );

  // =========================================================
  // FILTER RECORDS BY SELECTED PERIOD
  // =========================================================

  const periodRecords = useMemo(() => {
    if (isUnassignedView) {
      return records.filter((record) => !record.payroll_period_id);
    }

    if (!selectedPeriodId) return [];

    return records.filter(
      (record) =>
        String(record.payroll_period_id) === String(selectedPeriodId)
    );
  }, [records, selectedPeriodId, isUnassignedView]);

  const filteredRecords = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return periodRecords.filter((record) => {
      const matchesSearch =
        !keyword ||
        String(record.payroll_id || "").toLowerCase().includes(keyword) ||
        String(record.worker_name || "").toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "All" || record.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [periodRecords, search, statusFilter]);

  // =========================================================
  // PAYROLL SUMMARY
  // =========================================================

  const summary = useMemo(() => {
    const totalGross = periodRecords.reduce(
      (sum, record) =>
        sum +
        Number(
          record.gross ?? calculateGross(record.rate, record.days)
        ),
      0
    );

    const totalAdvance = periodRecords.reduce(
      (sum, record) => sum + Number(record.advance || 0),
      0
    );

    const totalNet = periodRecords.reduce(
      (sum, record) =>
        sum +
        Number(
          record.net ??
            calculateNet(record.rate, record.days, record.advance)
        ),
      0
    );

    return {
      total: periodRecords.length,
      pending: periodRecords.filter(
        (record) => record.status === "Pending"
      ).length,
      released: periodRecords.filter(
        (record) => record.status === "Released"
      ).length,
      totalGross,
      totalAdvance,
      totalNet,
    };
  }, [periodRecords]);

  // =========================================================
  // FORM COMPUTATION
  // =========================================================

  const selectedWorker = useMemo(
    () =>
      workers.find(
        (worker) =>
          String(worker.id) === String(form.farmers_workers_id)
      ),
    [workers, form.farmers_workers_id]
  );

  const previewGross = calculateGross(form.rate, form.days);

  const previewNet = calculateNet(
    form.rate,
    form.days,
    form.advance
  );

  // =========================================================
  // MODAL
  // =========================================================

  function openAddModal() {
    if (!canAddPayroll) {
      toast.error(
        "Payroll can only be added to the current month's Open payroll period."
      );
      return;
    }

    setEditingRecord(null);
    setForm({
      ...EMPTY_FORM,
      payroll_id: generatePayrollCode(),
    });
    setModalOpen(true);
  }

  function openEditModal(record) {
    if (!record.payroll_period_id || record.period_status !== "Open") {
      toast.error(
        "This payroll record cannot be edited because its period is closed or unassigned."
      );
      return;
    }

    setEditingRecord(record);

    setForm({
      payroll_id: record.payroll_id || "",
      farmers_workers_id: record.farmers_workers_id
        ? String(record.farmers_workers_id)
        : "",
      worker_name: record.worker_name || "",
      employment_type: record.employment_type || "Daily",
      rate: String(record.rate ?? "0"),
      days: String(record.days ?? "0"),
      advance: String(record.advance ?? "0"),
      status: STATUS_OPTIONS.includes(record.status)
        ? record.status
        : "Pending",
    });

    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingRecord(null);
    setForm({ ...EMPTY_FORM });
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => {
      const updated = {
        ...previous,
        [name]: value,
      };

      if (name === "farmers_workers_id") {
        const worker = workers.find(
          (item) => String(item.id) === value
        );

        updated.worker_name = worker?.name || "";
      }

      return updated;
    });
  }

  // =========================================================
  // SAVE PAYROLL
  // =========================================================

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.payroll_id.trim()) {
      toast.error(
        "Payroll code is missing. Please close and open the form again."
      );
      return;
    }

    if (!form.farmers_workers_id) {
      toast.error("Please select an existing farmer or worker.");
      return;
    }

    const worker = workers.find(
      (item) =>
        String(item.id) === String(form.farmers_workers_id)
    );

    if (!worker) {
      toast.error(
        "The selected farmer/worker could not be found. Please select an existing record."
      );
      return;
    }

    if (!worker.name?.trim()) {
      toast.error(
        "The selected farmer/worker does not have a valid name."
      );
      return;
    }

    const rate = Number(form.rate);
    const days = Number(form.days);
    const advance = Number(form.advance);

    if (
      form.rate === "" ||
      form.days === "" ||
      form.advance === "" ||
      !Number.isFinite(rate) ||
      !Number.isFinite(days) ||
      !Number.isFinite(advance) ||
      rate < 0 ||
      days < 0 ||
      advance < 0
    ) {
      toast.error(
        "Rate, days worked, and advance must be valid non-negative numbers."
      );
      return;
    }

    const gross = calculateGross(rate, days);

    if (advance > gross) {
      toast.error("Advance cannot be greater than gross pay.");
      return;
    }

    if (!STATUS_OPTIONS.includes(form.status)) {
      toast.error("Please select a valid payroll status.");
      return;
    }

    if (!form.employment_type.trim()) {
      toast.error("Please select an employment type.");
      return;
    }

    if (!editingRecord && !canAddPayroll) {
      toast.error(
        "The current payroll period is not open. You cannot add payroll at this time."
      );
      return;
    }

    if (
      editingRecord &&
      (!editingRecord.payroll_period_id ||
        editingRecord.period_status !== "Open")
    ) {
      toast.error("This payroll period is closed or unassigned.");
      return;
    }

    const payload = {
      payroll_id: form.payroll_id,
      farmers_workers_id: Number(worker.id),
      worker_name: worker.name.trim(),
      employment_type: form.employment_type,
      rate,
      days,
      advance,
      gross,
      net: gross - advance,
      status: form.status,
    };

    setSaving(true);

    try {
      if (editingRecord) {
        await apiRequest(`office/payroll/${editingRecord.id}`, {
          method: "PUT",
          token,
          body: payload,
        });

        toast.success("Payroll record updated successfully.");
      } else {
        await apiRequest("office/payroll", {
          method: "POST",
          token,
          body: payload,
        });

        toast.success("Payroll record added successfully.");
      }

      setModalOpen(false);
      setEditingRecord(null);
      setForm({ ...EMPTY_FORM });

      await loadData();
    } catch (err) {
      toast.error(err.message || "Unable to save payroll record.");
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // DELETE PAYROLL
  // =========================================================

  async function handleDelete(record) {
    if (!record.payroll_period_id || record.period_status !== "Open") {
      toast.error(
        "This payroll record cannot be deleted because its period is closed or unassigned."
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete payroll record "${record.payroll_id}" for ${record.worker_name}?`
    );

    if (!confirmed) return;

    setDeletingId(record.id);

    try {
      await apiRequest(`office/payroll/${record.id}`, {
        method: "DELETE",
        token,
      });

      toast.success("Payroll record deleted successfully.");
      await loadData();
    } catch (err) {
      toast.error(err.message || "Unable to delete payroll record.");
    } finally {
      setDeletingId(null);
    }
  }

  // =========================================================
  // PERIOD LABELS
  // =========================================================

  const selectedPeriodLabel = isUnassignedView
    ? "Unassigned Records"
    : selectedPeriod
      ? formatPeriod(
          selectedPeriod.period_month,
          selectedPeriod.period_year
        )
      : currentPeriod
        ? formatPeriod(
            currentPeriod.period_month,
            currentPeriod.period_year
          )
        : "Loading Period";

  const selectedPeriodStatus = isUnassignedView
    ? "Unassigned"
    : selectedPeriod?.status || "—";

  return (
    <main className="min-h-screen bg-[#F3F8FA] p-3 text-[#011C40] sm:p-5 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* HEADER */}
        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-[9px] font-extrabold tracking-[1.5px] text-[#54ACBF]">
              OFFICE MANAGEMENT
            </p>

            <h1 className="font-serif text-xl tracking-tight text-[#011C40] sm:text-2xl">
              Payroll
            </h1>

            <p className="mt-1 text-[12px] text-[#26658C]">
              Manage monthly farmer and worker payroll records.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            disabled={loading || !token || !canAddPayroll}
            className="rounded-xl bg-[#023859] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#011C40] disabled:cursor-not-allowed disabled:opacity-40"
          >
            + Add Payroll
          </button>
        </header>

        {/* PAYROLL PERIOD */}
        <section className="rounded-xl border border-[#54ACBF]/25 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="w-full lg:max-w-sm">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#023859]">
                Payroll Month
              </label>

              <select
                value={selectedPeriodId}
                onChange={(event) => {
                  setSelectedPeriodId(event.target.value);
                  setSearch("");
                  setStatusFilter("All");
                }}
                disabled={loading}
                className={inputClass}
              >
                {periods.map((period) => (
                  <option key={period.id} value={String(period.id)}>
                    {formatPeriod(
                      period.period_month,
                      period.period_year
                    )}
                    {" — "}
                    {period.status}
                  </option>
                ))}

                {hasUnassignedRecords && (
                  <option value="unassigned">
                    Unassigned / Legacy Records
                  </option>
                )}
              </select>
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#26658C]">
                  Selected Period
                </p>
                <p className="mt-1 text-[13px] font-bold text-[#011C40]">
                  {selectedPeriodLabel}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#26658C]">
                  Period Status
                </p>
                <div className="mt-1">
                  <PeriodBadge status={selectedPeriodStatus} />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (currentPeriod?.id) {
                    setSelectedPeriodId(String(currentPeriod.id));
                    setSearch("");
                    setStatusFilter("All");
                  }
                }}
                disabled={
                  loading ||
                  !currentPeriod?.id ||
                  isCurrentPeriodSelected
                }
                className="rounded-lg border border-[#54ACBF]/30 bg-[#A7EBF2]/20 px-3.5 py-2 text-[11px] font-semibold text-[#023859] transition hover:bg-[#A7EBF2]/50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Current Month
              </button>
            </div>
          </div>

          {!canAddPayroll && !isUnassignedView && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
              {selectedPeriod?.status === "Closed"
                ? "This payroll period is closed. You can view its records, but adding, editing, and deleting are disabled."
                : "Payroll can only be added to the current month's Open period."}
            </div>
          )}

          {isUnassignedView && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
              These records do not have an assigned monthly payroll period.
              They are displayed separately and cannot be edited or deleted
              through this page.
            </div>
          )}
        </section>

        {/* PAYROLL SUMMARY */}
        <section className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SummaryCard
              label="Total Payroll Records"
              value={formatNumber(summary.total)}
              description="Records for the selected period"
              icon="▤"
            />

            <SummaryCard
              label="Total Net Pay"
              value={formatCurrency(summary.totalNet)}
              description="Total amount after advances"
              icon="₱"
            />
          </div>

          {/* PAYROLL BREAKDOWN */}
          <div className="rounded-xl border border-[#54ACBF]/25 bg-[#A7EBF2]/15 p-4">
            <div className="mb-3">
              <h3 className="text-[12px] font-bold text-[#011C40]">
                Payroll Breakdown
              </h3>
              <p className="mt-0.5 text-[10px] text-[#26658C]">
                Summary of payroll status and payment amounts.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <BreakdownItem
                label="Pending"
                value={summary.pending}
                valueClass="text-amber-700"
              />

              <BreakdownItem
                label="Released"
                value={summary.released}
                valueClass="text-[#26658C]"
              />

              <BreakdownItem
                label="Gross Pay"
                value={formatCurrency(summary.totalGross)}
              />

              <BreakdownItem
                label="Total Advances"
                value={formatCurrency(summary.totalAdvance)}
                valueClass="text-amber-700"
              />

              <BreakdownItem
                label="Net Pay"
                value={formatCurrency(summary.totalNet)}
                valueClass="text-[#023859]"
              />
            </div>
          </div>
        </section>

        {/* PAYROLL TABLE */}
        <section className="overflow-hidden rounded-2xl border border-[#54ACBF]/25 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#A7EBF2]/50 p-4 sm:px-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-bold text-[#011C40]">
                Payroll Records
              </h2>

              <p className="mt-1 text-[11px] text-[#26658C]">
                {selectedPeriodLabel} payroll entries
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search payroll code or worker..."
                className={`${inputClass} sm:w-64`}
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={inputClass}
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Released">Released</option>
              </select>

              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="rounded-lg border border-[#54ACBF]/30 bg-[#A7EBF2]/20 px-3.5 py-2 text-[11px] font-semibold text-[#023859] transition hover:bg-[#A7EBF2]/50 disabled:opacity-50"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-[11px]">
              <thead className="bg-[#A7EBF2]/20 text-[10px] uppercase tracking-wider text-[#023859]">
                <tr>
                  <th className="px-4 py-3.5">Payroll Code</th>
                  <th className="px-4 py-3.5">Worker</th>
                  <th className="px-4 py-3.5">Employment Type</th>
                  <th className="px-4 py-3.5">Days Worked</th>
                  <th className="px-4 py-3.5">Gross Pay</th>
                  <th className="px-4 py-3.5">Advance</th>
                  <th className="px-4 py-3.5">Net Pay</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Period</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#A7EBF2]/30">
                {loading ? (
                  <tr>
                    <td
                      colSpan="10"
                      className="px-5 py-12 text-center text-[#26658C]"
                    >
                      Loading payroll records...
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-5 py-12 text-center">
                      <p className="font-semibold text-[#023859]">
                        No payroll records found.
                      </p>

                      <p className="mt-1 text-[10px] text-[#26658C]">
                        {isUnassignedView
                          ? "There are no unassigned payroll records."
                          : "No payroll entries have been added for this month yet."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => {
                    const gross = Number(
                      record.gross ??
                        calculateGross(record.rate, record.days)
                    );

                    const net = Number(
                      record.net ??
                        calculateNet(
                          record.rate,
                          record.days,
                          record.advance
                        )
                    );

                    const canManageRecord =
                      Boolean(record.payroll_period_id) &&
                      record.period_status === "Open";

                    return (
                      <tr
                        key={record.id}
                        className="transition hover:bg-[#A7EBF2]/10"
                      >
                        <td className="px-4 py-3.5 font-bold text-[#011C40]">
                          {record.payroll_id || "—"}
                        </td>

                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-[#011C40]">
                            {record.worker_name || "—"}
                          </p>

                          <p className="mt-1 text-[10px] text-[#26658C]/70">
                            ID: {record.farmers_workers_id || "—"}
                          </p>
                        </td>

                        <td className="px-4 py-3.5 text-[#26658C]">
                          {record.employment_type || "—"}
                        </td>

                        <td className="px-4 py-3.5 text-[#26658C]">
                          {formatNumber(record.days)}
                        </td>

                        <td className="px-4 py-3.5 font-medium text-[#011C40]">
                          {formatCurrency(gross)}
                        </td>

                        <td className="px-4 py-3.5 text-[#26658C]">
                          {formatCurrency(record.advance)}
                        </td>

                        <td className="px-4 py-3.5 font-bold text-[#023859]">
                          {formatCurrency(net)}
                        </td>

                        <td className="px-4 py-3.5">
                          <StatusBadge status={record.status} />
                        </td>

                        <td className="px-4 py-3.5">
                          <PeriodBadge status={record.period_status} />
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(record)}
                              disabled={!canManageRecord}
                              title={
                                canManageRecord
                                  ? "Edit payroll"
                                  : "This payroll period is closed or unassigned"
                              }
                              className="rounded-lg border border-[#54ACBF]/30 bg-[#A7EBF2]/20 px-3 py-2 text-[10px] font-semibold text-[#023859] transition hover:bg-[#A7EBF2]/60 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(record)}
                              disabled={
                                !canManageRecord ||
                                deletingId === record.id
                              }
                              title={
                                canManageRecord
                                  ? "Delete payroll"
                                  : "This payroll period is closed or unassigned"
                              }
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {deletingId === record.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[#A7EBF2]/40 bg-[#A7EBF2]/10 px-4 py-3 text-[10px] text-[#26658C]">
            Showing {filteredRecords.length} of {periodRecords.length} payroll
            records
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
                  OFFICE MANAGEMENT
                </p>

                <h2 className="mt-1 text-lg font-bold text-[#011C40]">
                  {editingRecord ? "Edit Payroll" : "Add Payroll"}
                </h2>

                <p className="mt-1 text-[11px] text-[#26658C]">
                  {formatPeriod(
                    editingRecord?.period_month ??
                      currentPeriod?.period_month,
                    editingRecord?.period_year ??
                      currentPeriod?.period_year
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#A7EBF2]/30 text-lg text-[#26658C] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {/* MODAL FORM */}
            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Payroll Code" required>
                    <input
                      value={form.payroll_id || ""}
                      readOnly
                      className={`${inputClass} cursor-not-allowed bg-[#A7EBF2]/20 font-semibold text-[#26658C]`}
                    />
                  </FormField>

                  <FormField label="Farmer / Worker" required>
                    <select
                      name="farmers_workers_id"
                      value={form.farmers_workers_id}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    >
                      <option value="">Select a farmer / worker</option>

                      {editingRecord &&
                        form.farmers_workers_id &&
                        !workers.some(
                          (worker) =>
                            String(worker.id) ===
                            String(form.farmers_workers_id)
                        ) && (
                          <option
                            value={form.farmers_workers_id}
                            disabled
                          >
                            Linked record unavailable (ID:{" "}
                            {form.farmers_workers_id})
                          </option>
                        )}

                      {workers.map((worker) => (
                        <option key={worker.id} value={worker.id}>
                          {worker.name}
                          {worker.role ? ` (${worker.role})` : ""}
                        </option>
                      ))}
                    </select>

                    <p className="mt-1.5 text-[10px] text-[#26658C]">
                      Select an existing record from Farmers & Workers.
                    </p>
                  </FormField>

                  <FormField label="Worker Name" required>
                    <input
                      value={
                        selectedWorker?.name ||
                        form.worker_name ||
                        ""
                      }
                      readOnly
                      required
                      placeholder="Select a farmer / worker"
                      className={`${inputClass} cursor-not-allowed bg-[#A7EBF2]/20 text-[#26658C]`}
                    />
                  </FormField>

                  <FormField label="Employment Type" required>
                    <select
                      name="employment_type"
                      value={form.employment_type}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    >
                      <option value="Daily">Daily</option>
                      <option value="Contractual">Contractual</option>
                      <option value="Regular">Regular</option>
                    </select>
                  </FormField>

                  <FormField label="Daily Rate (PHP)" required>
                    <input
                      type="number"
                      name="rate"
                      min="0"
                      step="0.01"
                      value={form.rate}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Days Worked" required>
                    <input
                      type="number"
                      name="days"
                      min="0"
                      step="0.1"
                      value={form.days}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Advance (PHP)">
                    <input
                      type="number"
                      name="advance"
                      min="0"
                      step="0.01"
                      value={form.advance}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Status" required>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Released">Released</option>
                    </select>
                  </FormField>
                </div>

                {/* PAYROLL COMPUTATION */}
                <div className="rounded-xl border border-[#54ACBF]/25 bg-[#A7EBF2]/15 p-4">
                  <h3 className="text-[12px] font-bold text-[#011C40]">
                    Payroll Computation
                  </h3>

                  <p className="mt-0.5 text-[10px] text-[#26658C]">
                    Automatic computation based on rate, days worked, and
                    advance.
                  </p>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#26658C]">
                        Gross Pay
                      </p>

                      <p className="mt-1 text-lg font-bold text-[#011C40]">
                        {formatCurrency(previewGross)}
                      </p>

                      <p className="mt-1 text-[10px] text-[#26658C]">
                        Daily rate × days worked
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#26658C]">
                        Net Pay
                      </p>

                      <p className="mt-1 text-lg font-bold text-[#023859]">
                        {formatCurrency(previewNet)}
                      </p>

                      <p className="mt-1 text-[10px] text-[#26658C]">
                        Gross pay − advance
                      </p>
                    </div>
                  </div>
                </div>

                {!workers.length && !loading && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
                    No Farmers & Workers records are available. Add a
                    farmer or worker first before creating payroll.
                  </div>
                )}
              </div>

              {/* MODAL FOOTER */}
              <div className="flex justify-end gap-2 border-t border-[#A7EBF2]/50 bg-white px-5 py-4 sm:px-6">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-[#54ACBF]/30 bg-white px-4 py-2.5 text-[11px] font-semibold text-[#26658C] transition hover:bg-[#A7EBF2]/20 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    !selectedWorker ||
                    !form.farmers_workers_id ||
                    !form.payroll_id ||
                    workers.length === 0 ||
                    (!editingRecord && !canAddPayroll)
                  }
                  className="rounded-xl bg-[#023859] px-5 py-2.5 text-[11px] font-semibold text-white transition hover:bg-[#011C40] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingRecord
                      ? "Update Payroll"
                      : "Save Payroll"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
