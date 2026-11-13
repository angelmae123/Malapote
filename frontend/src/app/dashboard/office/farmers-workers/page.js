
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

const initialForm = {
  name: "",
  role: "Farmer",
  contact_no: "",
  days_of_work: "0",
};

function getResponseData(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.records)) return response.records;
  return [];
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-PH", {
    maximumFractionDigits: 1,
  });
}

/* FORM FIELD */
function FormField({ label, required, htmlFor, children, hint }) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#023859]"
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children}

      {hint && (
        <p className="mt-1.5 text-[11px] text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
}

/* INPUT STYLES */
const inputClass =
  "w-full rounded-xl border border-[#54ACBF]/30 bg-[#A7EBF2]/10 px-3.5 py-2.5 text-[12px] text-[#011C40] outline-none transition placeholder:text-slate-400 focus:border-[#26658C] focus:bg-white focus:ring-2 focus:ring-[#54ACBF]/15 disabled:cursor-not-allowed disabled:opacity-50";

/* ROLE BADGE */
function RoleBadge({ role }) {
  const isFarmer = role === "Farmer";

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
        isFarmer
          ? "border-[#54ACBF]/30 bg-[#A7EBF2]/30 text-[#023859]"
          : "border-[#26658C]/20 bg-[#26658C]/10 text-[#26658C]"
      }`}
    >
      {role || "—"}
    </span>
  );
}

/* MAIN PAGE */
export default function FarmersWorkersPage() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  /* LOAD DATA */
  const loadRecords = useCallback(async () => {
    if (!token) {
      setLoading(false);
      toast.error("Your session has expired. Please sign in again.");
      return;
    }

    setLoading(true);

    try {
      const response = await apiRequest("office/farmers-workers", {
        token,
      });

      setRecords(getResponseData(response));
    } catch (error) {
      toast.error(
        error.message || "Unable to load farmers and workers."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadRecords();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadRecords]);

  /* FILTER RECORDS */
  const filteredRecords = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return records.filter((record) => {
      const matchesSearch =
        !keyword ||
        String(record.name || "").toLowerCase().includes(keyword) ||
        String(record.contact_no || "").toLowerCase().includes(keyword);

      const matchesRole =
        roleFilter === "All" || record.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [records, search, roleFilter]);

  /* SUMMARY */
  const summary = useMemo(() => {
    const farmers = records.filter(
      (record) => record.role === "Farmer"
    ).length;

    const workers = records.filter(
      (record) => record.role === "Worker"
    ).length;

    const totalDays = records.reduce(
      (sum, record) => sum + Number(record.days_of_work || 0),
      0
    );

    return {
      total: records.length,
      farmers,
      workers,
      totalDays,
    };
  }, [records]);

  /* FORM HANDLERS */
  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetForm = () => {
    if (saving) return;

    setForm({ ...initialForm });
    setEditingId(null);
    setShowForm(false);
  };

  const handleAdd = () => {
    setForm({ ...initialForm });
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (record) => {
    setForm({
      name: record.name || "",
      role: record.role || "Farmer",
      contact_no: record.contact_no || "",
      days_of_work: String(record.days_of_work ?? "0"),
    });

    setEditingId(record.id);
    setShowForm(true);
  };

  /* SAVE RECORD */
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      toast.error("Your session has expired. Please sign in again.");
      return;
    }

    if (!form.name.trim()) {
      toast.error("Full name is required.");
      return;
    }

    if (!["Farmer", "Worker"].includes(form.role)) {
      toast.error("Please select a valid role.");
      return;
    }

    const days = Number(form.days_of_work);

    if (
      form.days_of_work === "" ||
      !Number.isFinite(days) ||
      days < 0
    ) {
      toast.error("Days worked must be a valid non-negative number.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      role: form.role,
      contact_no: form.contact_no.trim() || null,
      days_of_work: days,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await apiRequest(
          `office/farmers-workers/${editingId}`,
          {
            method: "PUT",
            token,
            body: payload,
          }
        );

        toast.success("Record updated successfully.");
      } else {
        await apiRequest("office/farmers-workers", {
          method: "POST",
          token,
          body: payload,
        });

        toast.success("Farmer / worker added successfully.");
      }

      setForm({ ...initialForm });
      setEditingId(null);
      setShowForm(false);

      await loadRecords();
    } catch (error) {
      toast.error(error.message || "Unable to save record.");
    } finally {
      setSaving(false);
    }
  };

  /* DELETE RECORD */
  const handleDelete = async (record) => {
    if (!token) {
      toast.error("Your session has expired. Please sign in again.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${record.name}" from the farmers and workers directory?`
    );

    if (!confirmed) return;

    setDeletingId(record.id);

    try {
      await apiRequest(
        `office/farmers-workers/${record.id}`,
        {
          method: "DELETE",
          token,
        }
      );

      toast.success("Record deleted successfully.");
      await loadRecords();
    } catch (error) {
      toast.error(error.message || "Unable to delete record.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#F3F8FA] p-3 text-[#011C40] sm:p-5 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-5">

        {/* PAGE HEADER */}
        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-[9px] font-extrabold tracking-[1.5px] text-[#54ACBF]">
              OFFICE MANAGEMENT
            </p>

            <h1 className="text-xl font-serif tracking-tight text-[#011C40] sm:text-2xl">
              Farmers & Workers
            </h1>

            <p className="mt-1 text-[12px] text-[#26658C]">
              Manage registered farmers and workers involved in farm operations.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-[#023859] px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#011C40] sm:self-auto"
          >
            <span className="text-base leading-none">+</span>
            Add Farmer / Worker
          </button>
        </header>

        {/* SUMMARY INFORMATION */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">

          <div className="flex items-center gap-3 rounded-xl border border-[#54ACBF]/25 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A7EBF2]/40 text-lg text-[#26658C]">
              👥
            </div>

            <div>
              <p className="text-[11px] font-medium text-[#26658C]">
                Total Members
              </p>

              <p className="mt-0.5 text-xl font-bold text-[#011C40]">
                {loading ? "..." : summary.total}
              </p>

              <p className="mt-0.5 text-[10px] text-slate-400">
                Registered farmers and workers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-[#54ACBF]/25 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A7EBF2]/40 text-lg text-[#26658C]">
              🌾
            </div>

            <div>
              <p className="text-[11px] font-medium text-[#26658C]">
                Total Days Worked
              </p>

              <p className="mt-0.5 text-xl font-bold text-[#011C40]">
                {loading ? "..." : formatNumber(summary.totalDays)}
              </p>

              <p className="mt-0.5 text-[10px] text-slate-400">
                Combined recorded workdays
              </p>
            </div>
          </div>

        </section>

        {/* MEMBER BREAKDOWN */}
        <section className="flex flex-col gap-2 rounded-xl border border-[#54ACBF]/25 bg-[#A7EBF2]/15 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
              ℹ️
            </div>

            <div>
              <p className="text-[11px] font-bold text-[#023859]">
                Farmers & Workers Directory
              </p>

              <p className="mt-0.5 text-[11px] leading-relaxed text-[#26658C]">
                Keep member information and recorded workdays updated for easier farm activity monitoring.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pl-12 sm:pl-0">
            <span className="rounded-full border border-[#54ACBF]/30 bg-white px-3 py-1 text-[10px] font-semibold text-[#023859]">
              Farmers: {loading ? "..." : summary.farmers}
            </span>

            <span className="rounded-full border border-[#26658C]/20 bg-white px-3 py-1 text-[10px] font-semibold text-[#26658C]">
              Workers: {loading ? "..." : summary.workers}
            </span>
          </div>
        </section>

        {/* ADD / EDIT MODAL */}
        {showForm && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#011C40]/60 p-3 backdrop-blur-sm sm:p-5"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget &&
                !saving
              ) {
                resetForm();
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="farmers-workers-modal-title"
              className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#54ACBF]/30 bg-white shadow-2xl"
            >

              {/* MODAL HEADER */}
              <div className="flex items-center justify-between gap-4 border-b border-[#A7EBF2]/60 px-5 py-4 sm:px-6">
                <div>
                  <p className="mb-1 text-[9px] font-extrabold tracking-[1.3px] text-[#54ACBF]">
                    OFFICE MANAGEMENT
                  </p>

                  <h2
                    id="farmers-workers-modal-title"
                    className="text-lg font-bold text-[#011C40]"
                  >
                    {editingId !== null
                      ? "Edit Farmer / Worker"
                      : "Add Farmer / Worker"}
                  </h2>

                  <p className="mt-1 text-[11px] text-[#26658C]">
                    Enter the member information below.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  aria-label="Close modal"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#A7EBF2]/30 text-xl text-[#26658C] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  ×
                </button>
              </div>

              {/* MODAL FORM */}
              <form
                onSubmit={handleSubmit}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="overflow-y-auto px-5 py-5 sm:px-6">
                  <div className="mb-4 rounded-xl border border-[#54ACBF]/25 bg-[#A7EBF2]/15 p-3">
                    <p className="text-[11px] text-[#26658C]">
                      Fields marked with{" "}
                      <span className="font-bold text-red-500">*</span>{" "}
                      are required.
                    </p>
                  </div>

                  <div className="space-y-4">

                    {/* FULL NAME */}
                    <FormField
                      label="Full Name"
                      required
                      htmlFor="name"
                    >
                      <input
                        id="name"
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        maxLength={150}
                        required
                        placeholder="Enter full name"
                        className={inputClass}
                      />
                    </FormField>

                    {/* ROLE */}
                    <FormField
                      label="Role"
                      required
                      htmlFor="role"
                    >
                      <select
                        id="role"
                        name="role"
                        value={form.role}
                        onChange={handleChange}
                        required
                        className={inputClass}
                      >
                        <option value="Farmer">Farmer</option>
                        <option value="Worker">Worker</option>
                      </select>
                    </FormField>

                    {/* CONTACT NUMBER */}
                    <FormField
                      label="Contact Number"
                      htmlFor="contact_no"
                      hint="Optional. You may leave this blank if no contact number is available."
                    >
                      <input
                        id="contact_no"
                        type="tel"
                        name="contact_no"
                        value={form.contact_no}
                        onChange={handleChange}
                        maxLength={30}
                        placeholder="Enter contact number"
                        className={inputClass}
                      />
                    </FormField>

                    {/* DAYS WORKED */}
                    <FormField
                      label="Days Worked"
                      htmlFor="days_of_work"
                      hint="Enter the total recorded workdays of this member."
                    >
                      <input
                        id="days_of_work"
                        type="number"
                        name="days_of_work"
                        min="0"
                        step="0.1"
                        value={form.days_of_work}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </FormField>

                  </div>
                </div>

                {/* MODAL FOOTER */}
                <div className="flex flex-col-reverse gap-2 border-t border-[#A7EBF2]/50 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={saving}
                    className="rounded-xl border border-[#54ACBF]/40 px-5 py-2.5 text-[12px] font-semibold text-[#26658C] transition hover:bg-[#A7EBF2]/20 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[#023859] px-6 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#011C40] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : editingId !== null
                        ? "Update Record"
                        : "Save Record"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {/* FARMERS & WORKERS RECORDS */}
        <section className="overflow-hidden rounded-2xl border border-[#54ACBF]/25 bg-white shadow-sm">

          {/* TABLE HEADER */}
          <div className="flex flex-col gap-3 border-b border-[#A7EBF2]/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-base font-bold text-[#011C40]">
                Farmers & Workers Records
              </h2>

              <p className="mt-1 text-[11px] text-[#26658C]">
                Showing {filteredRecords.length} of {records.length} records
              </p>
            </div>

            <button
              type="button"
              onClick={loadRecords}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-[#54ACBF]/30 bg-[#A7EBF2]/20 px-3.5 py-2 text-[11px] font-semibold text-[#26658C] transition hover:bg-[#A7EBF2]/50 disabled:opacity-50 sm:self-auto"
            >
              <span className="text-sm">↻</span>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {/* SEARCH AND ROLE FILTER */}
          <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="member-search"
                className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#023859]"
              >
                Search Members
              </label>

              <input
                id="member-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or contact number..."
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="role-filter"
                className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#023859]"
              >
                Filter by Role
              </label>

              <select
                id="role-filter"
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className={inputClass}
              >
                <option value="All">All Roles</option>
                <option value="Farmer">Farmers</option>
                <option value="Worker">Workers</option>
              </select>
            </div>
          </div>

          {/* LOADING */}
          {loading ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#A7EBF2] border-t-[#26658C]" />

              <p className="text-[12px] text-[#26658C]">
                Loading farmers and workers...
              </p>
            </div>

          ) : records.length === 0 ? (

            /* EMPTY STATE */
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#A7EBF2]/30 text-2xl">
                👥
              </div>

              <h3 className="text-sm font-bold text-[#011C40]">
                No Members Yet
              </h3>

              <p className="mx-auto mt-1 max-w-sm text-[11px] text-[#26658C]">
                Add your first farmer or worker to start managing your farm workforce directory.
              </p>
            </div>

          ) : filteredRecords.length === 0 ? (

            /* NO FILTER RESULTS */
            <div className="p-12 text-center">
              <div className="mb-3 text-3xl">⌕</div>

              <h3 className="text-sm font-semibold text-[#011C40]">
                No Matching Records
              </h3>

              <p className="mt-1 text-[11px] text-[#26658C]">
                No farmers or workers match your current search and role filter.
              </p>
            </div>

          ) : (

            /* TABLE */
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-[11px]">

                <thead className="bg-[#A7EBF2]/20 text-[10px] uppercase tracking-wider text-[#023859]">
                  <tr>
                    <th className="px-4 py-3.5 font-bold">
                      Full Name
                    </th>

                    <th className="px-4 py-3.5 font-bold">
                      Role
                    </th>

                    <th className="px-4 py-3.5 font-bold">
                      Contact Number
                    </th>

                    <th className="px-4 py-3.5 font-bold">
                      Days Worked
                    </th>

                    <th className="px-4 py-3.5 text-right font-bold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#A7EBF2]/30">
                  {filteredRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="transition hover:bg-[#A7EBF2]/10"
                    >
                      <td className="px-4 py-3.5 font-semibold text-[#011C40]">
                        {record.name || "—"}
                      </td>

                      <td className="px-4 py-3.5">
                        <RoleBadge role={record.role} />
                      </td>

                      <td className="px-4 py-3.5 text-slate-600">
                        {record.contact_no || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-semibold tabular-nums text-[#023859]">
                        {formatNumber(record.days_of_work)}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEdit(record)}
                            disabled={deletingId !== null}
                            className="rounded-lg border border-[#54ACBF]/30 bg-[#A7EBF2]/20 px-3 py-1.5 text-[10px] font-semibold text-[#26658C] transition hover:bg-[#A7EBF2]/60 disabled:opacity-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(record)}
                            disabled={deletingId !== null}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[10px] font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId === record.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TABLE FOOTER */}
          {!loading && filteredRecords.length > 0 && (
            <div className="border-t border-[#A7EBF2]/40 bg-[#A7EBF2]/10 px-4 py-3">
              <p className="text-[10px] text-[#26658C]">
                Displaying{" "}
                <span className="font-bold text-[#023859]">
                  {filteredRecords.length}
                </span>{" "}
                of{" "}
                <span className="font-bold text-[#023859]">
                  {records.length}
                </span>{" "}
                farmer / worker record(s).
              </p>
            </div>
          )}

        </section>
      </div>
    </main>
  );
}
