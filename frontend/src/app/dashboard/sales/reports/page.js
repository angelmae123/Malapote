
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../providers";
import { apiRequest } from "../../../../lib/api";
import { toast } from "react-toastify";

const EMPTY_FORM = {
  start_date: "",
  end_date: "",
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-100";

function getResponseData(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
}

function getResponseObject(response) {
  let result = response;

  for (let i = 0; i < 3; i += 1) {
    if (
      result &&
      typeof result === "object" &&
      !Array.isArray(result) &&
      result.data &&
      typeof result.data === "object"
    ) {
      result = result.data;
    } else {
      break;
    }
  }

  return result && typeof result === "object" ? result : null;
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

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getReportCode(report) {
  if (report.report_id) return report.report_id;

  if (report.id) {
    return `RPT-${String(report.id).padStart(5, "0")}`;
  }

  return "—";
}

function SummaryCard({ label, value, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-3 break-words text-2xl font-semibold text-slate-900">
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-400">{description}</p>
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

function GraphCard({
  title,
  subtitle,
  reports,
  valueKey,
  color,
  formatter,
  unit = "",
}) {
  const maxValue = Math.max(
    ...reports.map((report) => Number(report[valueKey] || 0)),
    1
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>

        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      {reports.length === 0 ? (
        <div className="flex h-56 items-center justify-center text-sm text-slate-400">
          No report data available for this graph.
        </div>
      ) : (
        <>
          <div className="flex h-56 items-end gap-3 overflow-x-auto border-b border-slate-200 pb-2">
            {reports.map((report) => {
              const value = Number(report[valueKey] || 0);
              const height = (value / maxValue) * 100;

              return (
                <div
                  key={report.id}
                  className="flex h-full min-w-[65px] flex-1 flex-col items-center justify-end gap-2"
                  title={`${report.week_range}: ${formatter(value)} ${unit}`}
                >
                  <span className="max-w-full truncate text-center text-[10px] font-semibold text-slate-600">
                    {formatter(value)}
                  </span>

                  <div className="flex h-full w-full items-end justify-center">
                    <div
                      className={`w-full max-w-14 rounded-t-lg transition-all duration-300 ${color}`}
                      style={{
                        height: `${Math.max(height, value > 0 ? 3 : 0)}%`,
                        minHeight: value > 0 ? "4px" : "0",
                      }}
                    />
                  </div>

                  <span className="w-full truncate text-center text-[10px] text-slate-500">
                    {report.week_range || "Week"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>Weekly comparison</span>
            <span>Unit: {unit}</span>
          </div>
        </>
      )}
    </section>
  );
}

export default function ReportsPage() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [preview, setPreview] = useState(null);

  const loadReports = useCallback(async () => {
    setLoading(true);

    try {
      const response = await apiRequest("sales/reports", {
        token,
      });

      setReports(getResponseData(response));
    } catch (err) {
      toast.error(err.message || "Unable to load weekly reports.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const filteredReports = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return [...reports]
      .filter((report) => {
        return (
          !keyword ||
          String(report.week_range || "")
            .toLowerCase()
            .includes(keyword) ||
          getReportCode(report).toLowerCase().includes(keyword)
        );
      })
      .sort((a, b) => {
        const dateA = a.start_date || a.generated_date || "";
        const dateB = b.start_date || b.generated_date || "";

        return dateA.localeCompare(dateB);
      });
  }, [reports, search]);

  const graphReports = useMemo(
    () => filteredReports.slice(-8),
    [filteredReports]
  );

  const summary = useMemo(() => {
    return {
      totalReports: reports.length,

      totalSales: reports.reduce(
        (sum, item) => sum + Number(item.total_sales || 0),
        0
      ),

      totalProduction: reports.reduce(
        (sum, item) => sum + Number(item.total_production || 0),
        0
      ),
    };
  }, [reports]);

  const previewIsCurrent =
    preview &&
    preview.start_date === form.start_date &&
    preview.end_date === form.end_date;

  function openAddModal() {
    setEditingReport(null);
    setForm({ ...EMPTY_FORM });
    setPreview(null);

    toast.error("Unable to process this request right now. Please try again.");
    toast.notice("Notice updated.");
    setModalOpen(true);
  }

  function openEditModal(report) {
    setEditingReport(report);

    setForm({
      start_date: report.start_date || "",
      end_date: report.end_date || "",
    });

    // Require a fresh preview before updating.
    setPreview(null);

    toast.error("Unable to process this request right now. Please try again.");
    toast.notice("Notice updated.");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingReport(null);
    setForm(EMPTY_FORM);
    setPreview(null);
    toast.error("Unable to process this request right now. Please try again.");
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    // Previous totals are no longer valid after changing dates.
    setPreview(null);
    toast.error("Unable to process this request right now. Please try again.");
  }

  async function handleGenerateReport() {
    setPreview(null);

    if (!form.start_date || !form.end_date) {
      toast.error("Please select both start date and end date.");
      return;
    }

    if (form.end_date < form.start_date) {
      toast.error("End date cannot be earlier than start date.");
      return;
    }

    setGenerating(true);

    try {
      const response = await apiRequest("sales/reports/preview", {
        method: "POST",
        token,
        body: {
          start_date: form.start_date,
          end_date: form.end_date,
        },
      });

      const result = getResponseObject(response);

      if (
        !result ||
        result.total_sales === undefined ||
        result.total_production === undefined
      ) {
        throw new Error(
          "The server did not return the computed report totals."
        );
      }

      setPreview({
        week_range: result.week_range || "",
        start_date: result.start_date || form.start_date,
        end_date: result.end_date || form.end_date,
        total_sales: Number(result.total_sales || 0),
        total_production: Number(result.total_production || 0),
        generated_date: result.generated_date || "",
      });
    } catch (err) {
      toast.error(err.message || "Unable to generate weekly report.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.start_date || !form.end_date) {
      toast.error("Please select both start date and end date.");
      return;
    }

    if (form.end_date < form.start_date) {
      toast.error("End date cannot be earlier than start date.");
      return;
    }

    if (!previewIsCurrent) {
      toast.error("Please generate the report preview before saving.");
      return;
    }

    // Only send the selected date range.
    // The backend calculates the actual totals again.
    const payload = {
      start_date: form.start_date,
      end_date: form.end_date,
    };

    setSaving(true);

    try {
      if (editingReport) {
        await apiRequest(`sales/reports/${editingReport.id}`, {
          method: "PUT",
          token,
          body: payload,
        });

        toast.success("Weekly report updated successfully.");
      } else {
        await apiRequest("sales/reports", {
          method: "POST",
          token,
          body: payload,
        });

        toast.success("Weekly report saved successfully.");
      }

      closeModal();
      await loadReports();
    } catch (err) {
      toast.error(err.message || "Unable to save weekly report.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(report) {
    const confirmed = window.confirm(
      `Delete weekly report "${report.week_range}"?`
    );

    if (!confirmed) return;

    try {
      await apiRequest(`sales/reports/${report.id}`, {
        method: "DELETE",
        token,
      });

      toast.success("Weekly report deleted successfully.");
      await loadReports();
    } catch (err) {
      toast.error(err.message || "Unable to delete weekly report.");
    }
  }

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
              Weekly Reports
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Review weekly sales and milled rice production performance.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            + Generate Report
          </button>
        </header>

        {/* SUMMARY */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            label="Total Reports"
            value={formatNumber(summary.totalReports)}
            description="Saved weekly reports"
          />

          <SummaryCard
            label="Total Sales"
            value={formatCurrency(summary.totalSales)}
            description="Combined paid sales from saved reports"
          />

          <SummaryCard
            label="Total Production"
            value={`${formatNumber(summary.totalProduction)} kg`}
            description="Combined milled rice output"
          />
        </section>

        {/* GRAPHS */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-900">
              Performance Overview
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Graphs are generated from your saved weekly report records.
              Showing up to the latest eight matching reports.
            </p>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <GraphCard
              title="Weekly Sales"
              subtitle="Total sales for each reporting period"
              reports={graphReports}
              valueKey="total_sales"
              color="bg-blue-900"
              formatter={formatCurrency}
              unit="PHP"
            />

            <GraphCard
              title="Weekly Production"
              subtitle="Total milled rice output for each reporting period"
              reports={graphReports}
              valueKey="total_production"
              color="bg-sky-600"
              formatter={formatNumber}
              unit="kg"
            />
          </div>
        </section>

        {/* REPORT HISTORY */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Report Records
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                View and manage your saved sales and production reports.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reporting period..."
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-800"
              />

              <button
                type="button"
                onClick={loadReports}
                disabled={loading}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4">Report Code</th>
                  <th className="px-5 py-4">Reporting Period</th>
                  <th className="px-5 py-4">Start Date</th>
                  <th className="px-5 py-4">End Date</th>
                  <th className="px-5 py-4">Sales</th>
                  <th className="px-5 py-4">Production</th>
                  <th className="px-5 py-4">Generated</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      Loading reports...
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      No weekly reports found.
                    </td>
                  </tr>
                ) : (
                  [...filteredReports].reverse().map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-semibold text-blue-900">
                        {getReportCode(report)}
                      </td>

                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {report.week_range || "—"}
                      </td>

                      <td className="px-5 py-4">
                        {formatDate(report.start_date)}
                      </td>

                      <td className="px-5 py-4">
                        {formatDate(report.end_date)}
                      </td>

                      <td className="px-5 py-4 font-medium">
                        {formatCurrency(report.total_sales)}
                      </td>

                      <td className="px-5 py-4">
                        {formatNumber(report.total_production)} kg
                      </td>

                      <td className="px-5 py-4">
                        {formatDate(report.generated_date)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(report)}
                            className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(report)}
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
            Showing {filteredReports.length} of {reports.length} reports
          </div>
        </section>
      </div>

      {/* GENERATE / EDIT MODAL */}
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
                  {editingReport
                    ? "Update Weekly Report"
                    : "Generate Weekly Report"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving || generating}
                className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100"
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

                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-blue-900">
                    Automatic Report Generation
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-blue-800">
                    Select the reporting period. The system will automatically
                    calculate paid sales transactions and paid, non-cancelled
                    shop orders, along with completed milled rice production
                    within the selected dates.
                  </p>
                </div>

                {/* DATE RANGE */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Start Date" required>
                    <input
                      type="date"
                      name="start_date"
                      value={form.start_date}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="End Date" required>
                    <input
                      type="date"
                      name="end_date"
                      value={form.end_date}
                      onChange={handleChange}
                      min={form.start_date || undefined}
                      required
                      className={inputClass}
                    />
                  </FormField>
                </div>

                {/* GENERATE BUTTON */}
                <button
                  type="button"
                  onClick={handleGenerateReport}
                  disabled={generating || saving}
                  className="w-full rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {generating
                    ? "Calculating Report..."
                    : "Generate Weekly Report"}
                </button>

                {/* COMPUTED PREVIEW */}
                {previewIsCurrent && (
                  <section className="space-y-4 rounded-2xl border border-green-200 bg-green-50/50 p-5">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-green-800">
                        Report Preview
                      </p>

                      <h3 className="mt-1 text-lg font-semibold text-slate-900">
                        {preview.week_range || "Selected Reporting Period"}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(preview.start_date)} –{" "}
                        {formatDate(preview.end_date)}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Total Sales
                        </p>

                        <p className="mt-2 text-2xl font-semibold text-blue-900">
                          {formatCurrency(preview.total_sales)}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Paid transactions and paid orders
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Total Production
                        </p>

                        <p className="mt-2 text-2xl font-semibold text-green-800">
                          {formatNumber(preview.total_production)} kg
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Completed milled rice only
                        </p>
                      </div>
                    </div>

                    <p className="text-xs leading-relaxed text-slate-500">
                      These values are calculated from the database. They
                      cannot be manually edited. The server will calculate
                      them again when you save the report.
                    </p>
                  </section>
                )}

                {!previewIsCurrent && (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                    <p className="text-sm font-medium text-slate-600">
                      No report preview generated yet.
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Select your date range and click Generate Weekly Report.
                    </p>
                  </div>
                )}
              </div>

              {/* MODAL FOOTER */}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving || generating}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || generating || !previewIsCurrent}
                  className="rounded-xl bg-green-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingReport
                      ? "Save Changes"
                      : "Save Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
