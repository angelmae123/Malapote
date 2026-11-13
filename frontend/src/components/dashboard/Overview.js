
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../app/providers";
import { apiRequest } from "../../lib/api";

const COLORS = {
  light: "#A7EBF2",
  teal: "#54ACBF",
  blue: "#26658C",
  deep: "#023859",
  navy: "#011C40",
};

const sectionCards = {
  farm: [
    { key: "activities", label: "Farm activities", href: "/dashboard/farm/activity", icon: "✳" },
    { key: "inventory", label: "Inventory items", href: "/dashboard/farm/inventory", icon: "▤" },
    { key: "planting", label: "Planting records", href: "/dashboard/farm/planting-harvesting", icon: "⌁" },
  ],
  office: [
    { key: "workers", label: "Farmers & workers", href: "/dashboard/office/farmers-workers", icon: "♧" },
    { key: "payroll", label: "Payroll records", href: "/dashboard/office/payroll", icon: "₱" },
  ],
  mill: [
    { key: "millInventory", label: "Mill inventory", href: "/dashboard/mill/inventory", icon: "▦" },
    { key: "purchasing", label: "Palay purchases", href: "/dashboard/mill/production?tab=purchasing", icon: "⇄" },
    { key: "drying", label: "Drying records", href: "/dashboard/mill/production?tab=drying", icon: "☼" },
    { key: "milling", label: "Milling records", href: "/dashboard/mill/production?tab=milling", icon: "◉" },
  ],
  sales: [
    { key: "orders", label: "Orders", href: "/dashboard/sales/orders", icon: "▧" },
    { key: "transactions", label: "Sales transactions", href: "/dashboard/sales/transactions", icon: "₱" },
    { key: "products", label: "Products", href: "/dashboard/sales/products", icon: "□" },
    { key: "reports", label: "Weekly reports", href: "/dashboard/sales/reports", icon: "▥" },
  ],
};

const endpoints = {
  activities: "farm/activities",
  inventory: "farm/inventory",
  planting: "farm/planting-harvesting",
  workers: "office/farmers-workers",
  payroll: "office/payroll",
  millInventory: "mill/inventory",
  purchasing: "mill/purchasing",
  drying: "mill/drying",
  milling: "mill/milling",
  orders: "sales/orders",
  transactions: "sales/transactions",
  products: "sales/products",
  reports: "sales/reports",
};

const quickActions = {
  farm: [
    {
      title: "Record farm activity",
      description: "Add a new field activity",
      icon: "＋",
      href: "/dashboard/farm/activity",
    },
    {
      title: "Add planting record",
      description: "Track crop growth",
      icon: "⌁",
      href: "/dashboard/farm/planting-harvesting",
    },
  ],
  office: [
    {
      title: "Add a worker",
      description: "Update the staff directory",
      icon: "＋",
      href: "/dashboard/office/farmers-workers",
    },
    {
      title: "Create payroll record",
      description: "Record pay and advances",
      icon: "₱",
      href: "/dashboard/office/payroll",
    },
  ],
  mill: [
    {
      title: "Record palay purchase",
      description: "Add a new purchasing record",
      icon: "＋",
      href: "/dashboard/mill/production?tab=purchasing",
    },
    {
      title: "Manage milling",
      description: "View milling operations",
      icon: "▦",
      href: "/dashboard/mill/production?tab=milling",
    },
  ],
  sales: [
    {
      title: "Manage orders",
      description: "Review customer orders",
      icon: "＋",
      href: "/dashboard/sales/orders",
    },
    {
      title: "View transactions",
      description: "Review sales transactions",
      icon: "₱",
      href: "/dashboard/sales/transactions",
    },
  ],
};

function getRecords(response) {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response?.data)) return response.data;

  if (Array.isArray(response?.records)) return response.records;

  return [];
}

function formatCount(value) {
  return Number(value || 0).toLocaleString();
}

export default function Overview() {
  const { session } = useAuth();

  const isSuperAdmin = ["super_admin", "admin"].includes(
    session?.user?.role
  );

  const sections = useMemo(
    () =>
      isSuperAdmin
        ? ["farm", "mill", "sales", "office"]
        : [session?.user?.section].filter((section) =>
            Object.prototype.hasOwnProperty.call(sectionCards, section)
          ),
    [isSuperAdmin, session?.user?.section]
  );

  const [counts, setCounts] = useState({});
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;

    const availableKeys = sections.flatMap(
      (section) => sectionCards[section] || []
    ).map((card) => card.key);

    if (!session?.accessToken) {
      setLoading(false);
      setLoadError("Your session could not be verified. Please sign in again.");
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setLoadError("");

    Promise.all(
      availableKeys.map(async (key) => {
        try {
          const response = await apiRequest(endpoints[key], {
            token: session.accessToken,
          });

          return [key, getRecords(response), null];
        } catch (error) {
          return [key, [], error];
        }
      })
    ).then((results) => {
      if (!active) return;

      const nextCounts = {};
      const failures = [];

      for (const [key, records, error] of results) {
        if (error) {
          failures.push(key);
          continue;
        }

        nextCounts[key] = records.length;

        if (key === "activities") {
          setRecentActivities(records.slice(0, 5));
        }
      }

      setCounts(nextCounts);

      if (failures.length) {
        setLoadError(
          "Some summaries could not be retrieved. Check the API connection or your access permissions."
        );
      }

      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [sections, session?.accessToken]);

  const cards = sections.flatMap(
    (section) => sectionCards[section] || []
  );

  const actions = sections.flatMap(
    (section) => quickActions[section] || []
  );

  const greetingName =
    session?.user?.username?.split(" ")[0] || "Admin";

  const workspaceLabel = isSuperAdmin
    ? "Full access"
    : `${session?.user?.section || "Admin"} section`;

  return (
    <section className="flex flex-col gap-5">

      {/* WELCOME HEADER */}
      <div className="flex flex-col items-start justify-between gap-4 min-[561px]:flex-row min-[561px]:items-center">

        <div>
          <p className="mb-2 text-[10px] font-extrabold leading-relaxed tracking-[1.65px] text-[#26658C]">
            MALAPOTE RICEMILL · OPERATIONS CENTER
          </p>

          <h1 className="m-0 font-serif text-[30px] font-normal leading-tight tracking-tight text-[#011C40] min-[561px]:text-[clamp(29px,3vw,39px)]">
            Good day, {greetingName}.
          </h1>

          <p className="mt-2.5 max-w-xl text-xs leading-relaxed text-[#26658C]">
            Here is an overview of your workspace. Select a module to get
            started.
          </p>
        </div>

        {/* WORKSPACE INDICATOR */}
        <div className="flex min-h-[48px] min-w-[175px] items-center gap-3 rounded-xl border border-[#54ACBF]/30 bg-white px-4 py-2.5 shadow-sm">

          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#A7EBF2]/40 text-lg text-[#26658C]">
            ☀
          </span>

          <span>
            <small className="mb-1 block text-[8px] font-extrabold tracking-[1px] text-[#54ACBF]">
              YOUR WORKSPACE
            </small>

            <strong className="block text-xs capitalize text-[#011C40]">
              {workspaceLabel}
            </strong>
          </span>
        </div>
      </div>

      {/* API ERROR */}
      {loadError && (
        <p
          className="m-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800"
          role="status"
        >
          {loadError}
        </p>
      )}

      {/* SUMMARY CARDS */}
      <div
        className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${
          cards.length <= 4
            ? "min-[1101px]:grid-cols-4"
            : "min-[1101px]:grid-cols-4 2xl:grid-cols-5"
        }`}
      >
        {cards.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            prefetch={true}
            className="group flex min-h-[130px] flex-col rounded-xl border border-[#54ACBF]/30 bg-white p-3.5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#54ACBF] hover:shadow-md hover:shadow-[#26658C]/10 sm:min-h-[145px] sm:p-4"
          >
            <div className="flex items-center justify-between">

              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#A7EBF2]/30 text-lg text-[#26658C] transition group-hover:bg-[#26658C] group-hover:text-white">
                {card.icon}
              </span>

              <span className="text-sm text-[#54ACBF] transition group-hover:text-[#023859]">
                ↗
              </span>
            </div>

            <span className="mt-4 flex min-h-[32px] items-end font-serif text-[25px] leading-none text-[#011C40] sm:text-[28px]">
              {loading ? (
                <span className="h-6 w-10 animate-pulse rounded-md bg-[#A7EBF2]/40" />
              ) : (
                counts[card.key] !== undefined
                  ? formatCount(counts[card.key])
                  : "—"
              )}
            </span>

            <span className="mt-2 text-[10px] font-bold text-[#26658C] sm:text-[11px]">
              {card.label}
            </span>
          </Link>
        ))}
      </div>

      {/* MAIN DASHBOARD CONTENT */}
      <div className="grid grid-cols-1 gap-4 min-[1101px]:grid-cols-[minmax(0,1.32fr)_minmax(270px,.88fr)]">

        {/* LATEST FARM ACTIVITIES */}
        <section className="min-h-[260px] rounded-xl border border-[#54ACBF]/30 bg-white p-4 shadow-sm sm:p-5">

          <div className="mb-4 flex items-center justify-between gap-3">

            <div>
              <p className="mb-1.5 text-[9px] font-extrabold tracking-[1.65px] text-[#54ACBF]">
                LATEST FROM THE FIELD
              </p>

              <h2 className="m-0 font-serif text-xl font-normal text-[#011C40]">
                Farm activity
              </h2>
            </div>

            {sections.includes("farm") && (
              <Link
                className="text-[10px] font-bold text-[#26658C] transition hover:text-[#011C40]"
                href="/dashboard/farm/activity"
                prefetch={true}
              >
                View all <span className="ml-1 text-sm">→</span>
              </Link>
            )}
          </div>

          {!sections.includes("farm") ? (
            <div className="flex min-h-[170px] items-center justify-center text-center text-[11px] text-[#54ACBF]">
              Farm activity is not part of your section.
            </div>
          ) : loading ? (
            <div className="flex min-h-[170px] items-center justify-center gap-2 text-center text-[11px] text-[#26658C]">

              <span className="inline-block h-[17px] w-[17px] animate-spin rounded-full border-2 border-[#A7EBF2] border-t-[#26658C]" />

              Loading activity...
            </div>
          ) : recentActivities.length ? (
            <div className="pt-1">

              {recentActivities.map((activity, index) => (
                <article
                  className="grid min-h-[55px] grid-cols-[12px_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-[#A7EBF2]/40"
                  key={activity.id ?? activity.activity_id ?? index}
                >
                  <span className="h-2 w-2 rounded-full bg-[#54ACBF] shadow-[0_0_0_3px_rgba(167,235,242,0.35)]" />

                  <div className="min-w-0">

                    <strong className="block overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-bold text-[#011C40]">
                      {activity.activity || "Farm activity"}
                    </strong>

                    <span className="mt-1 block truncate text-[9px] text-[#26658C]">
                      {activity.area || "Area not specified"} ·{" "}
                      {activity.season || "No season"}
                    </span>
                  </div>

                  <time className="text-[9px] text-[#54ACBF]">
                    {activity.date || "—"}
                  </time>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[170px] items-center justify-center text-center text-[11px] text-[#54ACBF]">
              No farm activity records yet.
            </div>
          )}
        </section>

        {/* QUICK ACTIONS */}
        <section className="min-h-[260px] rounded-xl border border-[#54ACBF]/30 bg-white p-4 shadow-sm sm:p-5 min-[1101px]:min-h-[220px]">

          <div className="mb-4">
            <p className="mb-1.5 text-[9px] font-extrabold tracking-[1.65px] text-[#54ACBF]">
              GET STARTED
            </p>

            <h2 className="m-0 font-serif text-xl font-normal text-[#011C40]">
              Quick actions
            </h2>
          </div>

          <div className="grid">

            {actions.length ? (
              actions.map((action) => (
                <Link
                  key={action.title}
                  href={action.href}
                  prefetch={true}
                  className="group grid min-h-[62px] grid-cols-[34px_minmax(0,1fr)_12px] items-center gap-2.5 border-t border-[#A7EBF2]/40 transition hover:bg-[#A7EBF2]/10"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#A7EBF2]/30 text-base text-[#26658C] transition group-hover:bg-[#26658C] group-hover:text-white">
                    {action.icon}
                  </span>

                  <span className="min-w-0">

                    <strong className="block text-[10px] font-bold text-[#011C40]">
                      {action.title}
                    </strong>

                    <small className="mt-1 block text-[9px] text-[#26658C]">
                      {action.description}
                    </small>
                  </span>

                  <b className="text-xs font-normal text-[#54ACBF] transition group-hover:translate-x-0.5 group-hover:text-[#023859]">
                    →
                  </b>
                </Link>
              ))
            ) : (
              <div className="flex min-h-[170px] items-center justify-center text-center text-[11px] text-[#54ACBF]">
                Select a module from the sidebar to see available actions.
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
