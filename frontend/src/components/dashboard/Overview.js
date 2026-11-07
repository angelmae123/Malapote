"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../app/providers";
import { apiRequest } from "../../lib/api";

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

const summaryColumns = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-2 min-[561px]:grid-cols-3",
  4: "grid-cols-2 min-[561px]:grid-cols-3 min-[1101px]:grid-cols-4",
  5: "grid-cols-2 min-[561px]:grid-cols-3 min-[1101px]:grid-cols-5",
};

export default function Overview() {
  const { session } = useAuth();
  const isSuperAdmin = ["super_admin", "admin"].includes(session?.user?.role);
  const sections = useMemo(
    () => (isSuperAdmin ? ["farm", "mill", "sales", "office"] : [session?.user?.section].filter(Boolean)),
    [isSuperAdmin, session?.user?.section],
  );
  const [counts, setCounts] = useState({});
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    const availableKeys = sections.flatMap((section) => sectionCards[section] || [])
      .filter((card) => !card.unavailable)
      .map((card) => card.key);

    Promise.all(availableKeys.map(async (key) => {
      try {
        return [key, await apiRequest(endpoints[key], { token: session?.accessToken })];
      } catch (requestError) {
        return [key, requestError];
      }
    })).then((results) => {
      if (!active) return;
      const nextCounts = {};
      const failures = [];

      for (const [key, result] of results) {
        if (result instanceof Error) {
          failures.push(result.message);
        } else {
          nextCounts[key] = result.length;
          if (key === "activities") setRecentActivities(result.slice(0, 5));
        }
      }

      setCounts(nextCounts);
      if (failures.length) {
        setLoadError("Some summaries could not be retrieved from the API. Check the connection or your access.");
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [sections, session?.accessToken]);

  const cards = sections.flatMap((section) => sectionCards[section] || []);
  const greetingName = session?.user?.username?.split(" ")[0] || "Admin";

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col items-start justify-between gap-[15px] min-[561px]:flex-row min-[561px]:items-end min-[561px]:gap-[25px]">
        <div>
          <p className="mb-2.5 text-[10px] font-extrabold leading-[1.4] tracking-[1.65px] text-slate-500">MALAPOTE RICEMILL · OPERATIONS CENTER</p>
          <h1 className="m-0 font-serif text-[30px] font-normal leading-tight tracking-tight text-slate-900 min-[561px]:text-[clamp(29px,3vw,39px)]">Good day, {greetingName}.</h1>
          <p className="mt-2.5 max-w-xl text-xs leading-relaxed text-slate-500">Here is an overview of your workspace. Select a module to get started.</p>
        </div>
        <div className="flex min-h-[45px] min-w-[165px] items-center gap-2.5 rounded-[10px] border border-slate-200 bg-white px-[13px] py-2.5">
          <span className="text-[19px] text-blue-600">☀</span>
          <span><small className="mb-1 block text-[7px] font-extrabold tracking-[1px] text-slate-400">YOUR WORKSPACE</small><strong className="block text-[10px] capitalize text-slate-700">{isSuperAdmin ? "Full access" : `${session?.user?.section} section`}</strong></span>
        </div>
      </div>

      {loadError && <p className="m-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800" role="status">{loadError}</p>}

      <div className={`grid gap-[9px] sm:gap-[13px] ${summaryColumns[Math.min(cards.length, 5)] || "grid-cols-2 min-[561px]:grid-cols-3 min-[1101px]:grid-cols-5"}`}>
        {cards.map((card) => (
          <Link className={`group flex min-h-[127px] flex-col rounded-[11px] border border-slate-200 bg-white p-[13px] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg sm:min-h-[147px] sm:px-[17px] sm:pb-[14px] sm:pt-4 ${card.unavailable ? "bg-slate-50" : ""}`} href={card.href} key={card.key} prefetch={true}>
            <div className="flex items-center justify-between">
              <span className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-blue-50 text-base text-blue-700">{card.icon}</span>
              <span className="text-[13px] text-slate-400" aria-hidden="true">↗</span>
            </div>
            <span className="mt-[13px] flex min-h-[34px] items-end font-serif text-[25px] leading-none text-slate-800 sm:text-[28px]">
              {loading ? <span className="h-[25px] w-[38px] animate-pulse rounded bg-slate-100" /> : counts[card.key] ?? "—"}
            </span>
            <span className="mt-1.5 text-[10px] font-bold text-slate-500">{card.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-[17px] min-[1101px]:grid-cols-[minmax(0,1.32fr)_minmax(270px,.88fr)]">
        <section className="min-h-[260px] rounded-[11px] border border-slate-200 bg-white p-[15px] sm:p-[19px]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div><p className="mb-1.5 text-[10px] font-extrabold tracking-[1.65px] text-slate-500">LATEST FROM THE FIELD</p><h2 className="m-0 font-serif text-xl font-normal text-slate-800">Farm activity</h2></div>
            {sections.includes("farm") && <Link className="text-[9px] font-bold text-blue-700" href="/dashboard/farm/activity" prefetch={true}>View all <span className="ml-1 text-[13px]">→</span></Link>}
          </div>
          {!sections.includes("farm") ? (
            <div className="flex min-h-[170px] items-center justify-center gap-2 text-center text-[11px] text-slate-400"><span>Farm activity is not part of your section.</span></div>
          ) : loading ? (
            <div className="flex min-h-[170px] items-center justify-center gap-2 text-center text-[11px] text-slate-400"><span className="inline-block h-[17px] w-[17px] animate-spin rounded-full border-2 border-slate-200 border-t-blue-700" />Loading activity...</div>
          ) : recentActivities.length ? (
            <div className="pt-[3px]">
              {recentActivities.map((activity) => (
                <article className="grid min-h-[49px] grid-cols-[12px_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-slate-100" key={activity.id}>
                  <span className="h-[7px] w-[7px] rounded-full bg-blue-500 shadow-[0_0_0_3px_rgb(239_246_255)]" />
                  <div className="min-w-0">
                    <strong className="block overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-bold text-slate-700">{activity.activity || "Farm activity"}</strong>
                    <span className="mt-1 block text-[9px] text-slate-400">{activity.area || "Area not specified"} · {activity.season || "No season"}</span>
                  </div>
                  <time className="text-[9px] text-slate-500">{activity.date || "—"}</time>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[170px] items-center justify-center gap-2 text-center text-[11px] text-slate-400"><span>No farm activity records yet.</span></div>
          )}
        </section>

        <section className="min-h-[260px] rounded-[11px] border border-slate-200 bg-white p-[15px] sm:p-[19px] min-[1101px]:min-h-[220px]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div><p className="mb-1.5 text-[10px] font-extrabold tracking-[1.65px] text-slate-500">GET STARTED</p><h2 className="m-0 font-serif text-xl font-normal text-slate-800">Quick actions</h2></div>
          </div>
          <div className="grid">
            {sections.includes("farm") && (
              <>
                <Link className="grid min-h-[60px] grid-cols-[30px_minmax(0,1fr)_12px] items-center gap-2.5 border-t border-slate-100" href="/dashboard/farm/activity" prefetch={true}><span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-sm text-blue-700">＋</span><span><strong className="block text-[10px] text-slate-700">Record farm activity</strong><small className="mt-1 block text-[9px] text-slate-400">Add a new field activity</small></span><b className="text-xs font-normal text-slate-400">→</b></Link>
                <Link className="grid min-h-[60px] grid-cols-[30px_minmax(0,1fr)_12px] items-center gap-2.5 border-t border-slate-100" href="/dashboard/farm/planting-harvesting" prefetch={true}><span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-sm text-blue-700">⌁</span><span><strong className="block text-[10px] text-slate-700">Add planting record</strong><small className="mt-1 block text-[9px] text-slate-400">Track crop growth</small></span><b className="text-xs font-normal text-slate-400">→</b></Link>
              </>
            )}
            {sections.includes("office") && (
              <>
                <Link className="grid min-h-[60px] grid-cols-[30px_minmax(0,1fr)_12px] items-center gap-2.5 border-t border-slate-100" href="/dashboard/office/farmers-workers"><span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-sm text-blue-700">＋</span><span><strong className="block text-[10px] text-slate-700">Add a worker</strong><small className="mt-1 block text-[9px] text-slate-400">Update the staff directory</small></span><b className="text-xs font-normal text-slate-400">→</b></Link>
                <Link className="grid min-h-[60px] grid-cols-[30px_minmax(0,1fr)_12px] items-center gap-2.5 border-t border-slate-100" href="/dashboard/office/payroll"><span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-sm text-blue-700">₱</span><span><strong className="block text-[10px] text-slate-700">Create payroll record</strong><small className="mt-1 block text-[9px] text-slate-400">Record pay and advances</small></span><b className="text-xs font-normal text-slate-400">→</b></Link>
              </>
            )}
            {!sections.includes("farm") && !sections.includes("office") && (
              <div className="flex min-h-[170px] items-center justify-center gap-2 text-center text-[11px] text-slate-400">Select a module from the sidebar to see available actions.</div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
