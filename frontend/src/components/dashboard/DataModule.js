"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../app/providers";
import { apiRequest } from "../../lib/api";

const EMPTY_RECORDS = [];

const statusClasses = {
  available: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-rose-50 text-rose-700",
  completed: "bg-emerald-50 text-emerald-700",
  growing: "bg-amber-50 text-amber-700",
  harvested: "bg-emerald-50 text-emerald-700",
  inactive: "bg-slate-100 text-slate-600",
  "in-progress": "bg-amber-50 text-amber-700",
  "on-hold": "bg-slate-100 text-slate-600",
  paid: "bg-emerald-50 text-emerald-700",
  partial: "bg-amber-50 text-amber-700",
  pending: "bg-slate-100 text-slate-600",
  planned: "bg-slate-100 text-slate-600",
  processing: "bg-amber-50 text-amber-700",
  refunded: "bg-rose-50 text-rose-700",
};

function emptyValues(fields) {
  return Object.fromEntries(
    fields.map((field) => [field.name, field.defaultValue ?? ""]),
  );
}

function getRecords(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.data?.records)) return result.data.records;
  if (Array.isArray(result?.records)) return result.records;
  return [];
}

function getOptions(result, field) {
  const records = getRecords(result);

  return records.map((record) => ({
    value: String(record[field.optionValue || "id"] ?? ""),
    label:
      field.optionLabel === "season_name_with_id"
        ? `${record.season_name} (${record.season_id})`
        : String(record[field.optionLabel || "name"] ?? ""),
  })).filter((option) => option.value !== "");
}

function displayValue(value, column) {
  if (value === null || value === undefined || value === "") return "—";

  if (column.format === "currency") {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(Number(value));
  }

  if (column.format === "date") {
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

    return Number.isNaN(date.getTime())
      ? String(value)
      : new Intl.DateTimeFormat("en-PH", {
          dateStyle: "medium",
        }).format(date);
  }

  if (column.format === "number") {
    return new Intl.NumberFormat("en-PH", {
      maximumFractionDigits: 2,
    }).format(Number(value));
  }

  return String(value);
}

export default function DataModule({
  title,
  description,
  endpoint,
  fields,
  columns,
  itemName,
  primaryKey = "id",
}) {
  const { session } = useAuth();

  const [requestResult, setRequestResult] = useState({
    key: "",
    records: [],
    error: "",
  });

  const [dynamicOptions, setDynamicOptions] = useState({});
  const [optionsError, setOptionsError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [revision, setRevision] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState(() => emptyValues(fields));
  const [saving, setSaving] = useState(false);

  const token = session?.accessToken;
  const requestKey = `${endpoint}:${token || ""}:${revision}`;

  const loading = requestResult.key !== requestKey;
  const records = loading ? EMPTY_RECORDS : requestResult.records;
  const error = loading ? "" : requestResult.error;

  const recordButtonClass =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-[18px] text-[13px] font-bold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-70";

  const secondaryButtonClass =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-[18px] text-[13px] font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70";

  // Load table records.
  useEffect(() => {
    let active = true;

    apiRequest(endpoint, { token })
      .then((result) => {
        if (!active) return;

        setRequestResult({
          key: requestKey,
          records: getRecords(result),
          error: "",
        });
      })
      .catch((requestError) => {
        if (!active) return;

        setRequestResult({
          key: requestKey,
          records: [],
          error: requestError.message || "Could not load records.",
        });
      });

    return () => {
      active = false;
    };
  }, [endpoint, requestKey, token]);

  // Load dynamic dropdown options.
  useEffect(() => {
    let active = true;

    const dynamicFields = fields.filter(
      (field) => field.optionsEndpoint,
    );

    if (dynamicFields.length === 0) {
      setDynamicOptions({});
      setOptionsError("");
      return () => {
        active = false;
      };
    }

    async function loadOptions() {
      try {
        const results = await Promise.all(
          dynamicFields.map(async (field) => {
            const result = await apiRequest(field.optionsEndpoint, {
              token,
            });

            return [
              field.name,
              getOptions(result, field),
            ];
          }),
        );

        if (active) {
          setDynamicOptions(Object.fromEntries(results));
          setOptionsError("");
        }
      } catch (requestError) {
        if (active) {
          setOptionsError(
            requestError.message || "Could not load dropdown options.",
          );
        }
      }
    }

    loadOptions();

    return () => {
      active = false;
    };
  }, [fields, token]);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return records;

    return records.filter((record) =>
      columns.some((column) =>
        String(record[column.key] ?? "")
          .toLowerCase()
          .includes(normalizedQuery),
      ),
    );
  }, [columns, query, records]);

  function startCreate() {
    setEditing(null);
    setValues(emptyValues(fields));
    toast.notice("Notice updated.");
    setFormOpen(true);
  }

  function startEdit(record) {
    setEditing(record);

    setValues(
      Object.fromEntries(
        fields.map((field) => [
          field.name,
          record[field.name] === null ||
          record[field.name] === undefined
            ? ""
            : String(record[field.name]),
        ]),
      ),
    );

    toast.notice("Notice updated.");
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setValues(emptyValues(fields));
  }

  function formPayload() {
    return Object.fromEntries(
      fields.map((field) => {
        const value = values[field.name];

        if (value === "" && !field.required) {
          return [field.name, null];
        }

        if (field.type === "number") {
          return [field.name, value === "" ? null : Number(value)];
        }

        return [field.name, value];
      }),
    );
  }

  async function saveRecord(event) {
    event.preventDefault();

    setSaving(true);
    toast.notice("Notice updated.");

    const recordId = editing?.[primaryKey];

    if (editing && (recordId === undefined || recordId === null)) {
      setRequestResult((current) => ({
        ...current,
        key: requestKey,
        error: `Cannot update record: missing ${primaryKey}.`,
      }));
      setSaving(false);
      return;
    }

    try {
      await apiRequest(
        editing
          ? `${endpoint}/${encodeURIComponent(recordId)}`
          : endpoint,
        {
          method: editing ? "PUT" : "POST",
          token,
          body: formPayload(),
        },
      );

      setNotice(
        `${itemName} ${editing ? "updated" : "added"} successfully.`,
      );

      closeForm();
      setRevision((value) => value + 1);
    } catch (requestError) {
      setRequestResult((current) => ({
        ...current,
        key: requestKey,
        error:
          requestError.message ||
          `Could not save ${itemName.toLowerCase()}.`,
      }));
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(record) {
    const recordId = record?.[primaryKey];

    if (recordId === undefined || recordId === null) {
      setRequestResult((current) => ({
        ...current,
        key: requestKey,
        error: `Cannot delete record: missing ${primaryKey}.`,
      }));
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to delete this ${itemName.toLowerCase()}?`,
      )
    ) {
      return;
    }

    toast.notice("Notice updated.");

    try {
      await apiRequest(
        `${endpoint}/${encodeURIComponent(recordId)}`,
        {
          method: "DELETE",
          token,
        },
      );

      setNotice(`${itemName} deleted successfully.`);
      setRevision((value) => value + 1);
    } catch (requestError) {
      setRequestResult((current) => ({
        ...current,
        key: requestKey,
        error:
          requestError.message ||
          `Could not delete ${itemName.toLowerCase()}.`,
      }));
    }
  }

  return (
    <section className="max-w-[1300px]">
      <div className="mb-7 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2.5 text-[10px] font-extrabold leading-[1.4] tracking-[1.65px] text-slate-500">
            OPERATIONS · {itemName.toUpperCase()}
          </p>

          <h1 className="m-0 font-serif text-[clamp(29px,3vw,37px)] font-normal leading-tight tracking-tight text-slate-900">
            {title}
          </h1>

          <p className="mt-2 max-w-[640px] text-xs leading-relaxed text-slate-500">
            {description}
          </p>
        </div>

        <button
          className={`${recordButtonClass} w-full sm:w-auto`}
          onClick={startCreate}
          type="button"
        >
          <span aria-hidden="true">＋</span> Add record
        </button>
      </div>

      <div className="mb-3 flex min-h-[62px] flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <div className="flex items-baseline gap-2">
          <strong className="font-serif text-[21px] font-normal text-slate-700">
            {records.length}
          </strong>
          <span className="text-[10px] text-slate-500">
            total records
          </span>
        </div>

        <label className="flex min-h-[37px] w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-slate-400 sm:max-w-[270px]">
          <span aria-hidden="true" className="text-lg leading-none">
            ⌕
          </span>

          <input
            className="h-[34px] w-full min-w-0 bg-transparent text-[10px] text-slate-800 outline-none placeholder:text-slate-400"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search records..."
            value={query}
          />
        </label>
      </div>

      {error && (
        <p
          className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-relaxed text-rose-800"
          role="alert"
        >
          {error}
        </p>
      )}

      {notice && (
        <p
          className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs leading-relaxed text-emerald-800"
          role="status"
        >
          {notice}
        </p>
      )}

      <div className="min-h-[280px] overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex min-h-[270px] items-center justify-center gap-2.5 text-[11px] text-slate-500">
            <span className="inline-block h-[17px] w-[17px] animate-spin rounded-full border-2 border-slate-200 border-t-blue-700" />
            Loading records...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-[26px] text-center">
            <span
              className="grid h-11 w-11 place-items-center rounded-[13px] bg-blue-50 text-2xl text-blue-700"
              aria-hidden="true"
            >
              ⌁
            </span>

            <h2 className="mt-[15px] text-[19px] font-normal text-slate-800">
              {records.length
                ? "No matching records"
                : `No ${itemName.toLowerCase()} records yet`}
            </h2>

            <p className="my-2 mb-4 text-[10px] text-slate-500">
              {records.length
                ? "Try a different search term."
                : "Add your first record to see it in this list."}
            </p>

            {!records.length && (
              <button
                className={secondaryButtonClass}
                onClick={startCreate}
                type="button"
              >
                ＋ Add a record
              </button>
            )}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left whitespace-nowrap">
              <thead className="bg-slate-50">
                <tr>
                  {columns.map((column) => (
                    <th
                      className="h-[43px] border-b border-slate-200 px-[13px] text-[9px] font-extrabold text-slate-500"
                      key={column.key}
                    >
                      {column.label}
                    </th>
                  ))}

                  <th className="h-[43px] border-b border-slate-200 px-[13px] text-[9px] font-extrabold text-slate-500">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((record) => (
                  <tr
                    className="transition-colors hover:bg-slate-50"
                    key={record[primaryKey]}
                  >
                    {columns.map((column) => (
                      <td
                        className="h-[51px] px-[13px] py-2 text-[10px] text-slate-600"
                        key={column.key}
                      >
                        {column.key === "status" ? (
                          <span
                            className={`inline-block rounded-full px-2 py-[5px] text-[8px] font-extrabold ${
                              statusClasses[
                                String(record[column.key] || "pending")
                                  .toLowerCase()
                                  .replace(/[^a-z0-9]+/g, "-")
                              ] || "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {displayValue(record[column.key], column)}
                          </span>
                        ) : (
                          displayValue(record[column.key], column)
                        )}
                      </td>
                    ))}

                    <td className="h-[51px] px-[13px] py-2 text-right">
                      <button
                        className="px-1.5 py-1 text-[9px] font-bold text-blue-700 hover:underline"
                        onClick={() => startEdit(record)}
                        type="button"
                      >
                        Edit
                      </button>

                      <button
                        className="px-1.5 py-1 text-[9px] font-bold text-rose-700 hover:underline"
                        onClick={() => deleteRecord(record)}
                        type="button"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-[3px] sm:p-[22px]"
          onMouseDown={(event) =>
            event.target === event.currentTarget && closeForm()
          }
        >
          <section
            aria-labelledby="record-form-title"
            aria-modal="true"
            className="max-h-[min(90dvh,800px)] w-full max-w-[650px] overflow-y-auto rounded-[13px] border border-slate-200 bg-white p-5 shadow-2xl sm:p-[23px]"
            role="dialog"
          >
            <div className="mb-5 flex items-start justify-between gap-3.5">
              <div>
                <p className="mb-2 text-[10px] font-extrabold tracking-[1.65px] text-slate-500">
                  {editing ? "UPDATE RECORD" : "NEW RECORD"}
                </p>

                <h2
                  className="m-0 font-serif text-[22px] font-normal text-slate-800"
                  id="record-form-title"
                >
                  {editing
                    ? `Edit ${itemName.toLowerCase()}`
                    : `New ${itemName.toLowerCase()}`}
                </h2>
              </div>

              <button
                aria-label="Isara"
                className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-md bg-slate-100 text-xl text-slate-600 hover:bg-slate-200"
                onClick={closeForm}
                type="button"
              >
                ×
              </button>
            </div>

            <form
              className="grid grid-cols-1 gap-[15px] min-[561px]:grid-cols-2"
              onSubmit={saveRecord}
            >
              {fields.map((field) => {
                const options = field.optionsEndpoint
                  ? dynamicOptions[field.name] || []
                  : field.options || [];

                const isSelect =
                  Boolean(field.options) ||
                  Boolean(field.optionsEndpoint);

                return (
                  <label
                    className={`grid min-w-0 gap-2 ${
                      field.wide ? "min-[561px]:col-span-2" : ""
                    }`}
                    key={field.name}
                  >
                    <span className="text-[11px] font-bold text-slate-700">
                      {field.label}
                      {field.required && (
                        <b className="text-rose-700"> *</b>
                      )}
                    </span>

                    {isSelect ? (
                      <select
                        className="min-h-[47px] w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            [field.name]: event.target.value,
                          }))
                        }
                        required={field.required}
                        value={values[field.name]}
                      >
                        <option value="">
                          {field.optionsEndpoint
                            ? options.length
                              ? "Select season"
                              : "No seasons available"
                            : "Select an option"}
                        </option>

                        {options.map((option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="min-h-[47px] w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        max={field.max}
                        min={field.min}
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            [field.name]: event.target.value,
                          }))
                        }
                        placeholder={field.placeholder || ""}
                        required={field.required}
                        step={field.step}
                        type={field.type || "text"}
                        value={values[field.name]}
                      />
                    )}
                  </label>
                );
              })}

              {optionsError && (
                <p
                  className="col-span-full rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-relaxed text-rose-800"
                  role="alert"
                >
                  {optionsError}
                </p>
              )}

              <div className="col-span-full mt-1 flex justify-end gap-2 max-[560px]:flex-col-reverse">
                <button
                  className={`${secondaryButtonClass} max-[560px]:w-full`}
                  onClick={closeForm}
                  type="button"
                >
                  Cancel
                </button>

                <button
                  className={`${recordButtonClass} max-[560px]:w-full`}
                  disabled={saving}
                  type="submit"
                >
                  {saving
                    ? "Saving..."
                    : editing
                      ? "Save changes"
                      : "Save record"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}