"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../providers";
import { apiRequest } from "../../lib/api";

const COLORS = {
  light: "#A7EBF2",
  teal: "#54ACBF",
  blue: "#26658C",
  deep: "#023859",
  navy: "#011C40",
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const SECTION_ACTIONS = {
  farm: {
    title: "Farm Operations",
    description: "Monitor crop activities, inventory, and planting schedules.",
    links: [
      { label: "Activity Logs", href: "/dashboard/farm/activity" },
      {
        label: "Planting & Harvest",
        href: "/dashboard/farm/planting-harvesting",
      },
    ],
  },
  mill: {
    title: "Mill Operations",
    description: "Track production, inventory, and palay purchasing.",
    links: [
      { label: "Drying", href: "/dashboard/mill/production?tab=drying" },
      { label: "Milling", href: "/dashboard/mill/production?tab=milling" },
      {
        label: "Palay Purchasing",
        href: "/dashboard/mill/production?tab=purchasing",
      },
    ],
  },
  sales: {
    title: "Sales Operations",
    description: "Manage customer orders and sales reports.",
    links: [
      { label: "Orders", href: "/dashboard/sales/orders" },
      { label: "Products", href: "/dashboard/sales/products" },
      { label: "Weekly Reports", href: "/dashboard/sales/reports" },
    ],
  },
  office: {
    title: "Office Operations",
    description: "Manage staff records and monthly payroll.",
    links: [
      {
        label: "Farmers & Workers",
        href: "/dashboard/office/farmers-workers",
      },
      { label: "Payroll", href: "/dashboard/office/payroll" },
    ],
  },
};

const NAVIGATION_ITEMS = [
  {
    title: "Activity Logs",
    href: "/dashboard/farm/activity",
    icon: "✳",
    section: "farm",
  },
  {
    title: "Planting & Harvest",
    href: "/dashboard/farm/planting-harvesting",
    icon: "🌾",
    section: "farm",
  },
  {
    title: "Drying",
    href: "/dashboard/mill/production?tab=drying",
    icon: "☀",
    section: "mill",
  },
  {
    title: "Milling",
    href: "/dashboard/mill/production?tab=milling",
    icon: "▦",
    section: "mill",
  },
  {
    title: "Palay Purchasing",
    href: "/dashboard/mill/production?tab=purchasing",
    icon: "◈",
    section: "mill",
  },
  {
    title: "Mill Inventory",
    href: "/dashboard/mill/inventory",
    icon: "▤",
    section: "mill",
  },
  {
    title: "Orders",
    href: "/dashboard/sales/orders",
    icon: "▧",
    section: "sales",
  },
  {
    title: "Farmers & Workers",
    href: "/dashboard/office/farmers-workers",
    icon: "♧",
    section: "office",
  },
];

function getResponseData(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.records)) return response.records;
  return [];
}

function formatNumber(value, maximumFractionDigits = 2) {
  return Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: maximumFractionDigits === 2 ? 2 : 0,
    maximumFractionDigits,
  });
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
  });
}

function getDateMonth(value) {
  if (!value) return null;

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : date.getMonth();
}

/* SUMMARY CARD */
function SummaryCard({
  label,
  value,
  caption,
  href,
  icon,
  iconColor,
}) {
  const content = (
    <>
      <div className="flex items-center justify-between">
        <span className={`text-xl ${iconColor}`} aria-hidden="true">
          {icon}
        </span>

        <span className="text-xs font-medium text-[#26658C]">
          {label}
        </span>
      </div>

      <p className="mt-4 break-words text-2xl font-bold tracking-tight text-[#011C40]">
        {value}
      </p>

      <p className="mt-1 text-xs text-[#26658C]">
        {caption}
      </p>
    </>
  );

  const className =
    "flex min-h-[120px] flex-col justify-center rounded-2xl border border-[#54ACBF]/25 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#54ACBF] hover:shadow-md sm:p-5";

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

/* STATUS CARD */
function StatusCard({
  icon,
  title,
  badge,
  value,
  description,
  note,
  color,
}) {
  return (
    <article className="rounded-2xl border border-[#54ACBF]/25 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className={`text-xl ${color}`} aria-hidden="true">
          {icon}
        </span>

        <span className="rounded-full border border-[#54ACBF]/30 bg-[#A7EBF2]/25 px-3 py-1 text-[10px] font-semibold text-[#26658C]">
          {badge}
        </span>
      </div>

      <h2 className="mt-3 text-base font-semibold text-[#011C40]">
        {title}
      </h2>

      <p className="mt-3 text-lg font-semibold text-[#26658C]">
        {value}
      </p>

      <p className="mt-1 text-xs text-[#26658C]">
        {description}
      </p>

      <p className={`mt-2 text-xs font-semibold ${color}`}>
        {note}
      </p>
    </article>
  );
}

/* PRODUCTION CHART */
function ProductionChart({
  harvest,
  milling,
  showHarvest,
  showMilling,
  year,
}) {
  const maxHarvest = Math.max(...harvest, 0);
  const maxMilling = Math.max(...milling, 0);

  return (
    <section className="rounded-2xl border border-[#54ACBF]/25 bg-white p-4 shadow-sm sm:p-5">
      <div>
        <p className="mb-1 text-[9px] font-extrabold tracking-[1.5px] text-[#54ACBF]">
          PRODUCTION ANALYTICS
        </p>

        <h2 className="text-base font-bold text-[#011C40]">
          Production Overview
        </h2>

        <p className="mt-1 text-xs text-[#26658C]">
          Monthly harvest and milling production · {year}
        </p>
      </div>

      <div
        className="mt-6 grid h-48 grid-cols-6 items-end gap-2 sm:grid-cols-12 sm:gap-3"
        role="img"
        aria-label={`Monthly harvest and milling production for ${year}`}
      >
        {MONTHS.map((month, index) => {
          const harvestHeight =
            maxHarvest > 0
              ? (harvest[index] / maxHarvest) * 100
              : 0;

          const millingHeight =
            maxMilling > 0
              ? (milling[index] / maxMilling) * 100
              : 0;

          return (
            <div
              key={month}
              className="flex h-full min-w-0 flex-col items-center justify-end"
              title={`${month}: ${formatNumber(harvest[index])} tons harvested; ${formatNumber(milling[index], 0)} kg milled`}
            >
              <div className="flex h-full w-full items-end justify-center gap-1">
                {showHarvest && (
                  <div
                    className="w-2/5 max-w-3 rounded-t bg-[#54ACBF] transition-all"
                    style={{
                      height: `${harvestHeight}%`,
                      minHeight: harvest[index] > 0 ? "4px" : "0",
                    }}
                  />
                )}

                {showMilling && (
                  <div
                    className="w-2/5 max-w-3 rounded-t bg-[#023859] transition-all"
                    style={{
                      height: `${millingHeight}%`,
                      minHeight: milling[index] > 0 ? "4px" : "0",
                    }}
                  />
                )}
              </div>

              <span className="mt-2 text-[10px] font-medium text-[#26658C]">
                {month}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#A7EBF2]/50 pt-3 text-[10px] text-[#26658C]">
        {showHarvest && (
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#54ACBF]" />
            Harvest (tons)
          </span>
        )}

        {showMilling && (
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#023859]" />
            Milled rice (kg)
          </span>
        )}
      </div>
    </section>
  );
}

/* QUICK ACCESS NAVIGATION BUTTON */
function NavigationButton({ item }) {
  return (
    <Link
      href={item.href}
      className="group flex min-h-[58px] items-center gap-3 rounded-xl border border-[#54ACBF]/30 bg-white px-3 py-3 text-left transition duration-200 hover:border-[#54ACBF] hover:bg-[#A7EBF2]/25 hover:shadow-sm sm:px-4"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#A7EBF2]/40 text-lg text-[#26658C] transition group-hover:bg-[#26658C] group-hover:text-white">
        {item.icon}
      </span>

      <span className="min-w-0 flex-1 text-xs font-semibold leading-tight text-[#023859] transition group-hover:text-[#011C40] sm:text-sm">
        {item.title}
      </span>

      <span className="shrink-0 text-sm text-[#54ACBF] transition group-hover:translate-x-1 group-hover:text-[#023859]">
        →
      </span>
    </Link>
  );
}

/* MAIN DASHBOARD */
export default function DashboardOverviewPage() {
  const { session } = useAuth();

  const token = session?.accessToken;

  const isSuperAdmin = ["super_admin", "admin"].includes(
    session?.user?.role
  );

  const section = session?.user?.section;

  const sections = useMemo(
    () =>
      isSuperAdmin
        ? ["farm", "mill", "sales", "office"]
        : [section].filter((item) => SECTION_ACTIONS[item]),
    [isSuperAdmin, section]
  );

  const [refreshCount, setRefreshCount] = useState(0);

  const [result, setResult] = useState({
    key: "",
    summary: {},
    errors: [],
  });

  const requestKey = `${token || ""}:${sections.join(",")}:${refreshCount}`;

  const loading = result.key !== requestKey;

  const year = new Date().getFullYear();

  /* LOAD DASHBOARD DATA */
  useEffect(() => {
    let active = true;

    if (!token) {
      setResult({
        key: requestKey,
        summary: {},
        errors: ["Your session could not be verified."],
      });

      return () => {
        active = false;
      };
    }

    const requests = [];

    if (sections.includes("farm")) {
      requests.push(["harvest", "farm/planting-harvesting"]);
    }

    if (sections.includes("mill")) {
      requests.push(["inventory", "mill/inventory"]);
      requests.push(["milling", "mill/milling"]);
    }

    if (sections.includes("sales")) {
      requests.push(["transactions", "sales/transactions"]);
      requests.push(["orders", "sales/orders"]);
    }

    Promise.all(
      requests.map(async ([key, endpoint]) => {
        try {
          return {
            key,
            records: getResponseData(
              await apiRequest(endpoint, { token })
            ),
          };
        } catch (error) {
          return {
            key,
            error: error.message || `Unable to load ${key} data.`,
          };
        }
      })
    ).then((responses) => {
      if (!active) return;

      const summary = {};
      const errors = [];
      const recordsByKey = {};

      responses.forEach((response) => {
        if (response.error) {
          errors.push(response.error);
        } else {
          recordsByKey[response.key] = response.records;
        }
      });

      /* HARVEST SUMMARY */
      if (recordsByKey.harvest) {
        const harvestedRecords = recordsByKey.harvest.filter(
          (record) =>
            String(record.status || "").toLowerCase() === "harvested"
        );

        const monthlyHarvest = Array(12).fill(0);

        harvestedRecords.forEach((record) => {
          const month = getDateMonth(record.expected_harvest_date);

          const recordYear = Number(
            String(record.expected_harvest_date || "").slice(0, 4)
          );

          if (month !== null && recordYear === year) {
            monthlyHarvest[month] += Number(
              record.harvested_yield || 0
            );
          }
        });

        summary.harvest = {
          total: harvestedRecords.reduce(
            (total, record) =>
              total + Number(record.harvested_yield || 0),
            0
          ),
          monthly: monthlyHarvest,
        };
      }

      /* MILLING SUMMARY */
      if (recordsByKey.milling) {
        const completedMilling = recordsByKey.milling.filter(
          (record) =>
            String(record.status || "").toLowerCase() === "completed"
        );

        const monthlyMilling = Array(12).fill(0);

        completedMilling.forEach((record) => {
          const month = getDateMonth(record.milling_date);

          const recordYear = Number(
            String(record.milling_date || "").slice(0, 4)
          );

          if (month !== null && recordYear === year) {
            monthlyMilling[month] += Number(
              record.rice_output_kg || 0
            );
          }
        });

        summary.milling = {
          total: completedMilling.reduce(
            (total, record) =>
              total + Number(record.rice_output_kg || 0),
            0
          ),
          monthly: monthlyMilling,
        };
      }

      /* INVENTORY SUMMARY */
      if (recordsByKey.inventory) {
        summary.inventory = recordsByKey.inventory
          .filter((record) => {
            const category = String(
              record.category || ""
            ).toLowerCase();

            const name = String(
              record.item_name || ""
            ).toLowerCase();

            return (
              !category.includes("bran") &&
              !category.includes("broken") &&
              !name.includes("bran") &&
              !name.includes("broken rice")
            );
          })
          .reduce(
            (total, record) =>
              total + Number(record.stock_quantity || 0),
            0
          );
      }

      /* SALES SUMMARY */
      if (recordsByKey.transactions && recordsByKey.orders) {
        const paidTransactions = recordsByKey.transactions.filter(
          (transaction) =>
            String(transaction.status || "").toLowerCase() === "paid"
        );

        const paidOrderIds = new Set(
          paidTransactions
            .map((transaction) =>
              String(transaction.orders_id || "")
            )
            .filter(Boolean)
        );

        const paidOrders = recordsByKey.orders.filter((order) => {
          const orderStatus = String(
            order.status || ""
          ).toLowerCase();

          return (
            String(order.payment_status || "").toLowerCase() === "paid" &&
            orderStatus !== "cancelled" &&
            !paidOrderIds.has(String(order.id))
          );
        });

        summary.sales =
          paidTransactions.reduce(
            (total, transaction) =>
              total + Number(transaction.amount || 0),
            0
          ) +
          paidOrders.reduce(
            (total, order) =>
              total + Number(order.total_amount || 0),
            0
          );
      }

      setResult({
        key: requestKey,
        summary,
        errors,
      });
    });

    return () => {
      active = false;
    };
  }, [requestKey, sections, token, year]);

  const greetingName =
    session?.user?.username?.trim().split(/\s+/)[0] || "Admin";

  const summary = result.summary;

  /* SUMMARY CARDS */
  const cards = [
    sections.includes("farm") && {
      key: "harvest",
      label: "Farm",
      value: loading
        ? "..."
        : summary.harvest
          ? formatNumber(summary.harvest.total)
          : "—",
      caption: "Harvest yield (tons)",
      href: "/dashboard/farm/planting-harvesting",
      icon: "♧",
      iconColor: "text-[#54ACBF]",
    },

    sections.includes("mill") && {
      key: "milling",
      label: "Production",
      value: loading
        ? "..."
        : summary.milling
          ? `${formatNumber(summary.milling.total, 0)} kg`
          : "—",
      caption: "Milled rice output",
      href: "/dashboard/mill/production?tab=milling",
      icon: "✳",
      iconColor: "text-[#26658C]",
    },

    sections.includes("mill") && {
      key: "inventory",
      label: "Inventory",
      value:
        loading || summary.inventory === undefined
          ? loading
            ? "..."
            : "—"
          : `${formatNumber(summary.inventory, 0)} kg`,
      caption: "Available rice stock",
      href: "/dashboard/mill/inventory",
      icon: "⬡",
      iconColor: "text-[#023859]",
    },

    sections.includes("sales") && {
      key: "sales",
      label: "Shop",
      value:
        loading || summary.sales === undefined
          ? loading
            ? "..."
            : "—"
          : formatCurrency(summary.sales),
      caption: "Total paid sales",
      href: "/dashboard/sales/reports",
      icon: "🛒",
      iconColor: "text-[#26658C]",
    },

    sections.includes("office") && {
      key: "office",
      label: "Office",
      value: "Payroll",
      caption: "Manage staff and monthly payroll",
      href: "/dashboard/office/payroll",
      icon: "♧",
      iconColor: "text-[#54ACBF]",
    },
  ].filter(Boolean);

  const navigationItems = NAVIGATION_ITEMS.filter(
    (item) => sections.includes(item.section)
  );

  const emptyMonths = Array(12).fill(0);

  return (
    <div className="space-y-5">

      {/* DASHBOARD HEADER */}
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="mb-1.5 text-[9px] font-extrabold tracking-[1.5px] text-[#54ACBF]">
            MALAPOTE RICEMILL · OPERATIONS CENTER
          </p>

          <h1 className="text-xl font-bold text-[#011C40] sm:text-2xl">
            Good day, {greetingName}.
          </h1>

          <p className="mt-1 text-xs text-[#26658C]">
            Welcome back! Here&apos;s your operations summary.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRefreshCount((count) => count + 1)}
          disabled={loading}
          aria-label="Refresh dashboard data"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#54ACBF]/30 bg-[#A7EBF2]/40 text-lg text-[#26658C] transition hover:bg-[#A7EBF2] disabled:opacity-50"
        >
          {loading ? "…" : "↻"}
        </button>
      </header>

      {/* API ERROR */}
      {result.errors.length > 0 && !loading && (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
        >
          Some summaries could not be loaded. Check your access or connection,
          then refresh.
        </div>
      )}

      {/* SUMMARY CARDS: 3 COLUMNS = 2 ROWS ON DESKTOP */}
      <section
        aria-label="Operations summary"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        {cards.map(({ key, ...cardProps }) => (
          <SummaryCard key={key} {...cardProps} />
        ))}
      </section>

      {/* PRODUCTION CHART */}
      {(sections.includes("farm") || sections.includes("mill")) && (
        <ProductionChart
          harvest={summary.harvest?.monthly || emptyMonths}
          milling={summary.milling?.monthly || emptyMonths}
          showHarvest={sections.includes("farm")}
          showMilling={sections.includes("mill")}
          year={year}
        />
      )}

      {/* SYSTEM STATUS */}
      <section
        aria-label="System status"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <StatusCard
          icon="◉"
          title="IoT Monitoring"
          badge="Coming Soon"
          value="—"
          description="Rice stock sensor readings"
          note="Not yet connected"
          color="text-[#26658C]"
        />

        <StatusCard
          icon="♧"
          title="Harvest Prediction"
          badge="In Development"
          value="—"
          description="ML-based harvest estimate"
          note="Model not ready"
          color="text-[#54ACBF]"
        />
      </section>

      {/* QUICK ACCESS: SEPARATE NAVIGATION BUTTONS */}
      <section className="space-y-4 pt-2">
        <div>
          <p className="mb-1 text-[9px] font-extrabold tracking-[1.5px] text-[#54ACBF]">
            WORKSPACE NAVIGATION
          </p>

          <h2 className="text-lg font-bold text-[#011C40]">
            Quick Access
          </h2>

          <p className="mt-1 text-xs text-[#26658C]">
            Quickly navigate to your available system modules.
          </p>
        </div>

        {/* 4 COLUMNS × 2 ROWS ON DESKTOP */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {navigationItems.map((item) => (
            <NavigationButton
              key={item.href}
              item={item}
            />
          ))}
        </div>
      </section>

    </div>
  );
}
