
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
  "w-full rounded-xl border border-[#54ACBF]/30 bg-[#A7EBF2]/10 px-3.5 py-2.5 text-[12px] text-[#011C40] outline-none transition placeholder:text-[#26658C]/50 focus:border-[#26658C] focus:bg-white focus:ring-2 focus:ring-[#54ACBF]/15 disabled:cursor-not-allowed disabled:opacity-60";

// RESPONSE HELPERS

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

// FORMAT HELPERS

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
  if (report.report_id) return String(report.report_id);

  if (report.id) {
    return `RPT-${String(report.id).padStart(5, "0")}`;
  }

  return "—";
}

// SUMMARY CARD

function SummaryCard({ label, value, description, icon }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#54ACBF]/25 bg-white p-4 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A7EBF2]/40 text-lg font-bold text-[#26658C]">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-medium text-[#26658C]">
          {label}
        </p>

        <p className="mt-0.5 break-words text-xl font-bold text-[#011C40]">
          {value}
        </p>

        {description && (
          <p className="mt-0.5 text-[10px] text-[#26658C]/80">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

// FORM FIELD

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

// GRAPH CARD

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
    <section className="rounded-2xl border border-[#54ACBF]/25 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-5">
        <h2 className="text-base font-bold text-[#011C40]">
          {title}
        </h2>

        <p className="mt-1 text-[11px] text-[#26658C]">
          {subtitle}
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="flex h-56 items-center justify-center text-[11px] text-[#26658C]">
          No report data available for this graph.
        </div>
      ) : (
        <>
          <div className="flex h-56 items-end gap-3 overflow-x-auto border-b border-[#54ACBF]/20 pb-2">
            {reports.map((report, index) => {
              const value = Number(report[valueKey] || 0);
              const height = (value / maxValue) * 100;

              return (
                <div
                  key={report.id ?? `${report.week_range}-${index}`}
                  className="flex h-full min-w-[65px] flex-1 flex-col items-center justify-end gap-2"
                  title={`${report.week_range}: ${formatter(value)} ${unit}`}
                >
                  <span className="max-w-full truncate text-center text-[10px] font-semibold text-[#023859]">
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

                  <span className="w-full truncate text-center text-[10px] text-[#26658C]">
                    {report.week_range || "Week"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between text-[10px] text-[#26658C]">
            <span>Weekly comparison</span>
            <span>Unit: {unit}</span>
          </div>
        </>
      )}
    </section>
  );
}

// MAIN COMPONENT

export default function ReportsPage() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [reports, setReports] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [pageError, setPageError] = useState("");

  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [preview, setPreview] = useState(null);

  // LOAD REPORTS

  const loadReports = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setPageError("");

    try {
      const response = await apiRequest("sales/reports", {
        token,
      });

      setReports(getResponseData(response));
    } catch (err) {
      const message = err.message || "Unable to load weekly reports.";

      setPageError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // FILTER REPORTS

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

  // GRAPH DATA

  const graphReports = useMemo(
    () => filteredReports.slice(-8),
    [filteredReports]
  );

  // SUMMARY

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

  // PREVIEW VALIDATION

  const previewIsCurrent =
    Boolean(preview) &&
    preview.start_date === form.start_date &&
    preview.end_date === form.end_date;

  // MODAL HANDLING

  function openAddModal() {
    setEditingReport(null);
    setForm({ ...EMPTY_FORM });
    setPreview(null);
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
    setModalOpen(true);
  }

  function closeModal() {
    if (saving || generating) return;

    setModalOpen(false);
    setEditingReport(null);
    setForm({ ...EMPTY_FORM });
    setPreview(null);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    // Previous totals are no longer valid after changing dates.
    setPreview(null);
  }

  // GENERATE REPORT PREVIEW

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

      toast.success("Report preview generated successfully.");
    } catch (err) {
      toast.error(err.message || "Unable to generate weekly report.");
    } finally {
      setGenerating(false);
    }
  }

  // SAVE REPORT

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

      setModalOpen(false);
      setEditingReport(null);
      setForm({ ...EMPTY_FORM });
      setPreview(null);

      await loadReports();
    } catch (err) {
      toast.error(err.message || "Unable to save weekly report.");
    } finally {
      setSaving(false);
    }
  }

  // DELETE REPORT

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
              Weekly Reports
            </h1>

            <p className="mt-1 text-[12px] text-[#26658C]">
              Review weekly sales and milled rice production performance.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="rounded-xl bg-[#023859] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#011C40]"
          >
            + Generate Report
          </button>
        </header>

        {/* SUMMARY */}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SummaryCard
            label="Total Sales"
            value={formatCurrency(summary.totalSales)}
            description="Combined sales from saved reports"
            icon="₱"
          />

          <SummaryCard
            label="Total Production"
            value={`${formatNumber(summary.totalProduction)} kg`}
            description="Combined milled rice output"
            icon="▤"
          />
        </section>

        {/* REPORT BREAKDOWN */}

        <section className="rounded-xl border border-[#54ACBF]/25 bg-[#A7EBF2]/15 p-4">
          <div className="mb-3">
            <h2 className="text-[12px] font-bold text-[#011C40]">
              Report Overview
            </h2>

            <p className="mt-0.5 text-[10px] text-[#26658C]">
              Summary of saved weekly report records.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[#54ACBF]/15 bg-white/80 px-3 py-2.5">
              <p className="text-[10px] font-medium text-[#26658C]">
                Total Reports
              </p>

              <p className="mt-1 text-lg font-bold text-[#011C40]">
                {formatNumber(summary.totalReports)}
              </p>
            </div>

            <div className="rounded-lg border border-[#54ACBF]/15 bg-white/80 px-3 py-2.5">
              <p className="text-[10px] font-medium text-[#26658C]">
                Displayed Reports
              </p>

              <p className="mt-1 text-lg font-bold text-[#011C40]">
                {formatNumber(filteredReports.length)}
              </p>
            </div>

            <div className="rounded-lg border border-[#54ACBF]/15 bg-white/80 px-3 py-2.5">
              <p className="text-[10px] font-medium text-[#26658C]">
                Graph Coverage
              </p>

              <p className="mt-1 text-lg font-bold text-[#011C40]">
                {formatNumber(graphReports.length)} / 8
              </p>
            </div>
          </div>
        </section>

        {/* PAGE ERROR */}

        {pageError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[11px] text-red-700">
            {pageError}
          </div>
        )}

        {/* PERFORMANCE GRAPHS */}

        <section>
          <div className="mb-3">
            <p className="mb-1 text-[9px] font-extrabold tracking-[1.5px] text-[#54ACBF]">
              ANALYTICS
            </p>

            <h2 className="text-base font-bold text-[#011C40]">
              Performance Overview
            </h2>

            <p className="mt-1 text-[11px] text-[#26658C]">
              Weekly sales and production comparison from saved report records.
              Showing up to the latest eight matching reports.
            </p>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            <GraphCard
              title="Weekly Sales"
              subtitle="Total sales for each reporting period"
              reports={graphReports}
              valueKey="total_sales"
              color="bg-[#26658C]"
              formatter={formatCurrency}
              unit="PHP"
            />

            <GraphCard
              title="Weekly Production"
              subtitle="Total milled rice output for each reporting period"
              reports={graphReports}
              valueKey="total_production"
              color="bg-[#54ACBF]"
              formatter={formatNumber}
              unit="kg"
            />
          </div>
        </section>

        {/* REPORT HISTORY */}

        <section className="overflow-hidden rounded-2xl border border-[#54ACBF]/25 bg-white shadow-sm">

          {/* TABLE HEADER */}

          <div className="flex flex-col gap-3 border-b border-[#A7EBF2]/50 p-4 sm:px-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-bold text-[#011C40]">
                Report Records
              </h2>

              <p className="mt-1 text-[11px] text-[#26658C]">
                View and manage your saved sales and production reports.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reporting period..."
                className={`${inputClass} sm:w-56`}
              />

              <button
                type="button"
                onClick={loadReports}
                disabled={loading}
                className="rounded-lg border border-[#54ACBF]/30 bg-[#A7EBF2]/20 px-4 py-2 text-[11px] font-semibold text-[#023859] transition hover:bg-[#A7EBF2]/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {/* TABLE */}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-[11px]">

              <thead className="bg-[#A7EBF2]/20 text-[10px] uppercase tracking-wider text-[#023859]">
                <tr>
                  <th className="px-4 py-3">Report Code</th>
                  <th className="px-4 py-3">Reporting Period</th>
                  <th className="px-4 py-3">Start Date</th>
                  <th className="px-4 py-3">End Date</th>
                  <th className="px-4 py-3">Sales</th>
                  <th className="px-4 py-3">Production</th>
                  <th className="px-4 py-3">Generated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#A7EBF2]/30">

                {loading ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-4 py-12 text-center text-[11px] text-[#26658C]"
                    >
                      Loading reports...
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-4 py-12 text-center text-[11px] text-[#26658C]"
                    >
                      No weekly reports found.
                    </td>
                  </tr>
                ) : (
                  [...filteredReports].reverse().map((report) => (
                    <tr
                      key={report.id}
                      className="transition hover:bg-[#A7EBF2]/10"
                    >
                      <td className="px-4 py-3 font-bold text-[#26658C]">
                        {getReportCode(report)}
                      </td>

                      <td className="px-4 py-3 font-semibold text-[#011C40]">
                        {report.week_range || "—"}
                      </td>

                      <td className="px-4 py-3 text-[#26658C]">
                        {formatDate(report.start_date)}
                      </td>

                      <td className="px-4 py-3 text-[#26658C]">
                        {formatDate(report.end_date)}
                      </td>

                      <td className="px-4 py-3 font-semibold text-[#011C40]">
                        {formatCurrency(report.total_sales)}
                      </td>

                      <td className="px-4 py-3 font-semibold text-[#011C40]">
                        {formatNumber(report.total_production)} kg
                      </td>

                      <td className="px-4 py-3 text-[#26658C]">
                        {formatDate(report.generated_date)}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(report)}
                            className="rounded-lg border border-[#54ACBF]/30 bg-[#A7EBF2]/20 px-3 py-2 text-[10px] font-semibold text-[#023859] transition hover:bg-[#A7EBF2]/60"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(report)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-semibold text-red-700 transition hover:bg-red-100"
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

          <div className="border-t border-[#A7EBF2]/40 bg-[#A7EBF2]/10 px-4 py-3">
            <p className="text-[10px] text-[#26658C]">
              Showing {filteredReports.length} of {reports.length} reports
            </p>
          </div>

        </section>
      </div>

      {/* GENERATE / EDIT MODAL */}

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
                  {editingReport
                    ? "Update Weekly Report"
                    : "Generate Weekly Report"}
                </h2>

                <p className="mt-0.5 text-[11px] text-[#26658C]">
                  Select a reporting period and preview the calculated totals.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving || generating}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#A7EBF2]/30 text-xl text-[#26658C] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >

              {/* MODAL CONTENT */}

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">

                {/* INFORMATION */}

                <div className="rounded-xl border border-[#54ACBF]/25 bg-[#A7EBF2]/15 p-4">
                  <p className="text-[11px] font-bold text-[#023859]">
                    Automatic Report Generation
                  </p>

                  <p className="mt-1 text-[10px] leading-relaxed text-[#26658C]">
                    Select the reporting period. The system calculates sales
                    transactions and completed milled rice production within
                    the selected dates. Report totals are generated by the
                    backend and cannot be manually edited.
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
                      disabled={saving || generating}
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
                      disabled={saving || generating}
                      className={inputClass}
                    />
                  </FormField>
                </div>

                {/* GENERATE BUTTON */}

                <button
                  type="button"
                  onClick={handleGenerateReport}
                  disabled={generating || saving}
                  className="w-full rounded-xl bg-[#023859] px-5 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#011C40] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generating
                    ? "Calculating Report..."
                    : "Generate Report Preview"}
                </button>

                {/* REPORT PREVIEW */}

                {previewIsCurrent ? (
                  <section className="space-y-4 rounded-xl border border-[#54ACBF]/30 bg-[#A7EBF2]/10 p-4">

                    <div>
                      <p className="text-[9px] font-extrabold tracking-[1.5px] text-[#54ACBF]">
                        REPORT PREVIEW
                      </p>

                      <h3 className="mt-1 text-base font-bold text-[#011C40]">
                        {preview.week_range || "Selected Reporting Period"}
                      </h3>

                      <p className="mt-1 text-[10px] text-[#26658C]">
                        {formatDate(preview.start_date)} –{" "}
                        {formatDate(preview.end_date)}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">

                      <div className="rounded-xl border border-[#54ACBF]/20 bg-white p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#26658C]">
                          Total Sales
                        </p>

                        <p className="mt-2 break-words text-xl font-bold text-[#023859]">
                          {formatCurrency(preview.total_sales)}
                        </p>

                        <p className="mt-1 text-[10px] text-[#26658C]">
                          Sales within selected period
                        </p>
                      </div>

                      <div className="rounded-xl border border-[#54ACBF]/20 bg-white p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#26658C]">
                          Total Production
                        </p>

                        <p className="mt-2 text-xl font-bold text-[#023859]">
                          {formatNumber(preview.total_production)} kg
                        </p>

                        <p className="mt-1 text-[10px] text-[#26658C]">
                          Completed milled rice output
                        </p>
                      </div>

                    </div>

                    <p className="text-[10px] leading-relaxed text-[#26658C]">
                      These values are calculated from the database and cannot
                      be manually edited. The server will calculate them again
                      when you save the report.
                    </p>
                  </section>
                ) : (
                  <div className="rounded-xl border border-dashed border-[#54ACBF]/40 bg-[#A7EBF2]/10 p-5 text-center">
                    <p className="text-[11px] font-semibold text-[#023859]">
                      No report preview generated yet.
                    </p>

                    <p className="mt-1 text-[10px] text-[#26658C]">
                      Select your date range and click Generate Report Preview.
                    </p>
                  </div>
                )}

              </div>

              {/* MODAL FOOTER */}

              <div className="flex flex-col-reverse gap-2 border-t border-[#A7EBF2]/50 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving || generating}
                  className="rounded-xl border border-[#54ACBF]/30 bg-white px-4 py-2.5 text-[11px] font-semibold text-[#26658C] transition hover:bg-[#A7EBF2]/20 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || generating || !previewIsCurrent}
                  className="rounded-xl bg-[#023859] px-5 py-2.5 text-[11px] font-semibold text-white transition hover:bg-[#011C40] disabled:cursor-not-allowed disabled:opacity-50"
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
