
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../providers";
import { apiRequest } from "../../../../lib/api";
import { toast } from "react-toastify";

const EMPTY_FORM = {
  name: "",
  role: "Farmer",
  contact_no: "",
  days_of_work: "0",
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-100";

function getResponseData(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
}

function SummaryCard({ label, value, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
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

export default function FarmersWorkersPage() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadRecords = useCallback(async () => {
    setLoading(true);

    try {
      const response = await apiRequest("office/farmers-workers", {
        token,
      });

      setRecords(getResponseData(response));
    } catch (err) {
      toast.error(err.message || "Unable to load farmers and workers.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

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

  function openAddModal() {
    setEditingRecord(null);
    setForm({ ...EMPTY_FORM });
    toast.error("Unable to process this request right now. Please try again.");
    setModalOpen(true);
  }

  function openEditModal(record) {
    setEditingRecord(record);

    setForm({
      name: record.name || "",
      role: record.role || "Farmer",
      contact_no: record.contact_no || "",
      days_of_work: String(record.days_of_work ?? "0"),
    });

    toast.error("Unable to process this request right now. Please try again.");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingRecord(null);
    setForm({ ...EMPTY_FORM });
    toast.error("Unable to process this request right now. Please try again.");
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("Full name is required.");
      return;
    }

    const days = Number(form.days_of_work);

    if (!Number.isFinite(days) || days < 0) {
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
      if (editingRecord) {
        await apiRequest(
          `office/farmers-workers/${editingRecord.id}`,
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

      closeModal();
      await loadRecords();
    } catch (err) {
      toast.error(err.message || "Unable to save record.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(record) {
    const confirmed = window.confirm(
      `Delete "${record.name}" from the farmers and workers directory?`
    );

    if (!confirmed) return;

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
    } catch (err) {
      toast.error(err.message || "Unable to delete record.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-900">
              Office Management
            </p>

            <h1 className="font-serif text-3xl font-semibold text-slate-900">
              Farmers & Workers
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage the farmers and workers directory.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            + Add Farmer / Worker
          </button>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total Members"
            value={summary.total}
            description="Registered farmers and workers"
          />

          <SummaryCard
            label="Farmers"
            value={summary.farmers}
            description="Registered farmers"
          />

          <SummaryCard
            label="Workers"
            value={summary.workers}
            description="Registered workers"
          />

          <SummaryCard
            label="Total Days Worked"
            value={summary.totalDays.toLocaleString("en-PH", {
              maximumFractionDigits: 1,
            })}
            description="Combined recorded workdays"
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Directory Records
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                View and manage registered farmers and workers.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or contact..."
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-800"
              />

              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-800"
              >
                <option value="All">All Roles</option>
                <option value="Farmer">Farmer</option>
                <option value="Worker">Worker</option>
              </select>

              <button
                type="button"
                onClick={loadRecords}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-212.5 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4">Name</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">Contact Number</th>
                  <th className="px-5 py-4">Days Worked</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-5 py-12 text-center text-slate-500">
                      Loading directory...
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-5 py-12 text-center text-slate-500">
                      No farmers or workers found.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {record.name}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            record.role === "Farmer"
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {record.role || "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {record.contact_no || "—"}
                      </td>

                      <td className="px-5 py-4">
                        {Number(record.days_of_work || 0).toLocaleString(
                          "en-PH",
                          { maximumFractionDigits: 1 }
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(record)}
                            className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(record)}
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
            Showing {filteredRecords.length} of {records.length} records
          </div>
        </section>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/60 p-3 sm:p-5">
          <div className="flex max-h-[95vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-900">
                  Office Management
                </p>

                <h2 className="mt-1 font-serif text-xl font-semibold text-slate-900">
                  {editingRecord
                    ? "Edit Farmer / Worker"
                    : "Add Farmer / Worker"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
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

                <FormField label="Full Name" required>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    maxLength={150}
                    placeholder="Enter full name"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Role" required>
                  <select
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

                <FormField label="Contact Number">
                  <input
                    type="tel"
                    name="contact_no"
                    value={form.contact_no}
                    onChange={handleChange}
                    maxLength={30}
                    placeholder="Enter contact number"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Days Worked">
                  <input
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

              <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingRecord
                      ? "Update Record"
                      : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
