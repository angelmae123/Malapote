
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../providers";
import { apiRequest } from "../../../../lib/api";

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

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-100";

const STATUS_OPTIONS = ["Pending", "Released"];

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

function SummaryCard({ label, value, description }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <p className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {label}
        </p>

        <p className="shrink-0 text-base font-semibold text-slate-900">
          {value}
        </p>
      </div>

      <p className="mt-1 truncate text-[10px] text-slate-400">
        {description}
      </p>
    </div>
  );
}

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

function StatusBadge({ status }) {
  const styles = {
    Released: "bg-green-100 text-green-700",
    Pending: "bg-amber-100 text-amber-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status || "—"}
    </span>
  );
}

function PeriodBadge({ status }) {
  const isOpen = status === "Open";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        isOpen
          ? "bg-green-100 text-green-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {status || "Unassigned"}
    </span>
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

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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
    setError("");

    try {
      // Correct backend route:
      // api/office/payroll-current-period
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
      setError(err.message || "Unable to load payroll records.");
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
    (record) =>
      !record.payroll_period_id ||
      record.payroll_period_id === null
  );

  // =========================================================
  // FILTER RECORDS BY SELECTED MONTH
  // =========================================================

  const periodRecords = useMemo(() => {
    if (isUnassignedView) {
      return records.filter(
        (record) =>
          !record.payroll_period_id ||
          record.payroll_period_id === null
      );
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
  // MONTHLY SUMMARY
  // =========================================================

  const summary = useMemo(() => {
    const totalGross = periodRecords.reduce(
      (sum, record) =>
        sum +
        Number(
          record.gross ??
            calculateGross(record.rate, record.days)
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

  const selectedWorker = workers.find(
    (worker) => String(worker.id) === String(form.farmers_workers_id)
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
      setError(
        "Payroll can only be added to the current month's Open payroll period."
      );
      return;
    }

    setEditingRecord(null);

    setForm({
      ...EMPTY_FORM,
      payroll_id: generatePayrollCode(),
    });

    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function openEditModal(record) {
    if (
      !record.payroll_period_id ||
      record.period_status !== "Open"
    ) {
      setError(
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

    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingRecord(null);
    setForm({ ...EMPTY_FORM });
    setError("");
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

    setError("");
    setNotice("");

    if (!form.payroll_id.trim()) {
      setError(
        "Payroll code is missing. Please close and open the form again."
      );
      return;
    }

    if (!form.farmers_workers_id) {
      setError("Please select an existing farmer or worker.");
      return;
    }

    const worker = workers.find(
      (item) =>
        String(item.id) === String(form.farmers_workers_id)
    );

    if (!worker) {
      setError(
        "The selected farmer/worker could not be found. Please select an existing record."
      );
      return;
    }

    if (!worker.name?.trim()) {
      setError(
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
      setError(
        "Rate, days worked, and advance must be valid non-negative numbers."
      );
      return;
    }

    const gross = calculateGross(rate, days);

    if (advance > gross) {
      setError("Advance cannot be greater than gross pay.");
      return;
    }

    if (!STATUS_OPTIONS.includes(form.status)) {
      setError("Please select a valid payroll status.");
      return;
    }

    if (!form.employment_type.trim()) {
      setError("Please select an employment type.");
      return;
    }

    if (!editingRecord && !canAddPayroll) {
      setError(
        "The current payroll period is not open. You cannot add payroll at this time."
      );
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
        await apiRequest(
          `office/payroll/${editingRecord.id}`,
          {
            method: "PUT",
            token,
            body: payload,
          }
        );

        setNotice("Payroll record updated successfully.");
      } else {
        await apiRequest("office/payroll", {
          method: "POST",
          token,
          body: payload,
        });

        setNotice("Payroll record added successfully.");
      }

      setModalOpen(false);
      setEditingRecord(null);
      setForm({ ...EMPTY_FORM });

      await loadData();
    } catch (err) {
      setError(err.message || "Unable to save payroll record.");
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // DELETE PAYROLL
  // =========================================================

  async function handleDelete(record) {
    if (
      !record.payroll_period_id ||
      record.period_status !== "Open"
    ) {
      setError(
        "This payroll record cannot be deleted because its period is closed or unassigned."
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete payroll record "${record.payroll_id}" for ${record.worker_name}?`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await apiRequest(`office/payroll/${record.id}`, {
        method: "DELETE",
        token,
      });

      setNotice("Payroll record deleted successfully.");
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to delete payroll record.");
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
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* HEADER */}
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-900">
              Office Management
            </p>

            <h1 className="font-serif text-3xl font-semibold text-slate-900">
              Payroll
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage monthly farmer and worker payroll records.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            disabled={loading || !token || !canAddPayroll}
            className="rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Add Payroll
          </button>
        </header>

        {/* NOTIFICATIONS */}
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

        {/* MONTHLY PERIOD SELECTOR */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="w-full lg:max-w-sm">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Payroll Month
              </label>

              <select
                value={selectedPeriodId}
                onChange={(event) => {
                  setSelectedPeriodId(event.target.value);
                  setSearch("");
                  setStatusFilter("All");
                  setError("");
                  setNotice("");
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

            <div className="flex flex-wrap items-center gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Selected Period
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {selectedPeriodLabel}
                </p>
              </div>

              <div className="ml-0 sm:ml-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
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
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Current Month
              </button>
            </div>
          </div>

          {!canAddPayroll && !isUnassignedView && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {selectedPeriod?.status === "Closed"
                ? "This payroll period is closed. You can view its records, but adding, editing, and deleting are disabled."
                : "Payroll can only be added to the current month's Open period."}
            </div>
          )}

          {isUnassignedView && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              These records do not have an assigned monthly payroll period.
              They are displayed separately and cannot be edited or deleted
              through this page.
            </div>
          )}
        </section>

{/* PAYROLL SUMMARY - ALL IN ONE BOX */}
<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
  <div className="grid grid-cols-7 gap-2">

    {/* TOTAL RECORDS */}
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-3">
      <p className="truncate text-[9px] font-bold uppercase text-slate-500">
        Total Records
      </p>
      <p className="mt-1 truncate text-lg font-semibold text-slate-900">
        {summary.total}
      </p>
    </div>

    {/* PENDING */}
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-3">
      <p className="truncate text-[9px] font-bold uppercase text-slate-500">
        Pending
      </p>
      <p className="mt-1 truncate text-lg font-semibold text-amber-700">
        {summary.pending}
      </p>
    </div>

    {/* RELEASED */}
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-3">
      <p className="truncate text-[9px] font-bold uppercase text-slate-500">
        Released
      </p>
      <p className="mt-1 truncate text-lg font-semibold text-green-700">
        {summary.released}
      </p>
    </div>

    {/* TOTAL NET PAY */}
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-3">
      <p className="truncate text-[9px] font-bold uppercase text-slate-500">
        Total Net Pay
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-blue-900">
        {formatCurrency(summary.totalNet)}
      </p>
    </div>

    {/* TOTAL GROSS PAY */}
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-3">
      <p className="truncate text-[9px] font-bold uppercase text-slate-500">
        Gross Pay
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-900">
        {formatCurrency(summary.totalGross)}
      </p>
    </div>

    {/* TOTAL ADVANCES */}
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-3">
      <p className="truncate text-[9px] font-bold uppercase text-slate-500">
        Advances
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-amber-700">
        {formatCurrency(summary.totalAdvance)}
      </p>
    </div>

    {/* NET PAY */}
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-3">
      <p className="truncate text-[9px] font-bold uppercase text-slate-500">
        Net Pay
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-blue-900">
        {formatCurrency(summary.totalNet)}
      </p>
    </div>

  </div>
</section>
        {/* PAYROLL TABLE */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Payroll Records
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {selectedPeriodLabel} payroll entries
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search payroll code or worker..."
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-800"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-800"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Released">Released</option>
              </select>

              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4">Payroll Code</th>
                  <th className="px-5 py-4">Worker</th>
                  <th className="px-5 py-4">Employment Type</th>
                  <th className="px-5 py-4">Days Worked</th>
                  <th className="px-5 py-4">Gross Pay</th>
                  <th className="px-5 py-4">Advance</th>
                  <th className="px-5 py-4">Net Pay</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Period</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan="10"
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      Loading payroll records...
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-5 py-12 text-center">
                      <p className="font-medium text-slate-600">
                        No payroll records found.
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
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
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {record.payroll_id || "—"}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">
                            {record.worker_name || "—"}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            ID: {record.farmers_workers_id || "—"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          {record.employment_type || "—"}
                        </td>

                        <td className="px-5 py-4">
                          {formatNumber(record.days)}
                        </td>

                        <td className="px-5 py-4 font-medium">
                          {formatCurrency(gross)}
                        </td>

                        <td className="px-5 py-4">
                          {formatCurrency(record.advance)}
                        </td>

                        <td className="px-5 py-4 font-semibold text-blue-900">
                          {formatCurrency(net)}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge status={record.status} />
                        </td>

                        <td className="px-5 py-4">
                          <PeriodBadge status={record.period_status} />
                        </td>

                        <td className="px-5 py-4">
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
                              className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(record)}
                              disabled={!canManageRecord}
                              title={
                                canManageRecord
                                  ? "Delete payroll"
                                  : "This payroll period is closed or unassigned"
                              }
                              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Delete
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

          <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-500">
            Showing {filteredRecords.length} of {periodRecords.length} payroll records
          </div>
        </section>
      </div>

      {/* ADD / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 sm:p-5">
          <div className="flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-900">
                  Office Management
                </p>

                <h2 className="mt-1 font-serif text-xl font-semibold text-slate-900">
                  {editingRecord ? "Edit Payroll" : "Add Payroll"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
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
                className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100 disabled:opacity-50"
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Payroll Code" required>
                    <input
                      value={form.payroll_id || ""}
                      readOnly
                      className={`${inputClass} cursor-not-allowed bg-slate-100 font-semibold text-slate-600`}
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
                      <option value="">
                        Select a farmer / worker
                      </option>

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

                    <p className="mt-1.5 text-xs text-slate-500">
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
                      className={`${inputClass} cursor-not-allowed bg-slate-100 text-slate-600`}
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

                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <h3 className="text-sm font-semibold text-blue-900">
                    Payroll Computation
                  </h3>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Gross Pay
                      </p>

                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {formatCurrency(previewGross)}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Daily rate × days worked
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Net Pay
                      </p>

                      <p className="mt-1 text-lg font-semibold text-blue-900">
                        {formatCurrency(previewNet)}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Gross pay − advance
                      </p>
                    </div>
                  </div>
                </div>

                {!workers.length && !loading && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    No Farmers & Workers records are available. Add a
                    farmer or worker first before creating payroll.
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
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
                  className="rounded-xl bg-blue-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
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
