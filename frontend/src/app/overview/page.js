"use client";

import Link from "next/link";

const navigationItems = [
  {
    title: "Activity Logs",
    href: "/dashboard/farm/activity",
    icon: "✳",
    category: "Farm Operations",
  },
  {
    title: "Planting & Harvest",
    href: "/dashboard/farm/planting-harvesting",
    icon: "🌾",
    category: "Farm Operations",
  },
  {
    title: "Drying",
    href: "/dashboard/mill/production?tab=drying",
    icon: "☀",
    category: "Mill Operations",
  },
  {
    title: "Milling",
    href: "/dashboard/mill/production?tab=milling",
    icon: "▦",
    category: "Mill Operations",
  },
  {
    title: "Palay Purchasing",
    href: "/dashboard/mill/production?tab=purchasing",
    icon: "◈",
    category: "Mill Operations",
  },
  {
    title: "Mill Inventory",
    href: "/dashboard/mill/inventory",
    icon: "▤",
    category: "Mill Operations",
  },
  {
    title: "Orders",
    href: "/dashboard/sales/orders",
    icon: "▧",
    category: "Sales",
  },
  {
    title: "Farmers & Workers",
    href: "/dashboard/office/farmers-workers",
    icon: "♧",
    category: "Office Management",
  },
];

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-6">

      {/* WELCOME BANNER */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-[#54ACBF]/30 bg-white p-6 shadow-sm md:flex-row md:items-center md:p-8">
        <div>
          <span className="rounded-full border border-[#54ACBF]/30 bg-[#A7EBF2]/30 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#26658C]">
            Malapote Ricemill System
          </span>

          <h1 className="mt-3 text-2xl font-bold text-[#011C40] md:text-3xl">
            Welcome to your workspace.
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#26658C]">
            Manage your harvest operations, inventory flow, milling processes,
            and office records seamlessly from one centralized platform.
          </p>
        </div>

        <Link
          href="/dashboard/mill/production?tab=purchasing"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#26658C] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-[#26658C]/20 transition hover:bg-[#023859]"
        >
          <span className="text-lg">+</span>
          New Palay Purchase
        </Link>
      </div>

      {/* QUICK SUMMARY GRID CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {/* FARM HARVESTS */}
        <Link
          href="/dashboard/farm/planting-harvesting"
          className="group rounded-2xl border border-[#54ACBF]/30 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#54ACBF] hover:shadow-md"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-[#26658C]">
              Farm Harvests
            </span>
            <span className="text-xl text-[#54ACBF] transition group-hover:text-[#023859]">
              ✳
            </span>
          </div>

          <h3 className="text-2xl font-bold text-[#011C40]">
            0.00 <span className="text-xs font-normal text-[#26658C]">bags</span>
          </h3>

          <p className="mt-1 text-xs text-[#54ACBF]">
            Logged for this season
          </p>
        </Link>

        {/* MILL INVENTORY */}
        <Link
          href="/dashboard/mill/inventory"
          className="group rounded-2xl border border-[#54ACBF]/30 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#54ACBF] hover:shadow-md"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-[#26658C]">
              Mill Inventory
            </span>
            <span className="text-xl text-[#54ACBF] transition group-hover:text-[#023859]">
              ▦
            </span>
          </div>

          <h3 className="text-2xl font-bold text-[#011C40]">
            0 <span className="text-xs font-normal text-[#26658C]">stocks</span>
          </h3>

          <p className="mt-1 text-xs text-[#54ACBF]">
            Current milled rice ready
          </p>
        </Link>

        {/* ACTIVE ORDERS */}
        <Link
          href="/dashboard/sales/orders"
          className="group rounded-2xl border border-[#54ACBF]/30 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#54ACBF] hover:shadow-md"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-[#26658C]">
              Active Orders
            </span>
            <span className="text-xl text-[#54ACBF] transition group-hover:text-[#023859]">
              ▧
            </span>
          </div>

          <h3 className="text-2xl font-bold text-[#011C40]">0</h3>

          <p className="mt-1 text-xs text-[#54ACBF]">
            Pending processing
          </p>
        </Link>

        {/* WORKERS ON DUTY */}
        <Link
          href="/dashboard/office/farmers-workers"
          className="group rounded-2xl border border-[#54ACBF]/30 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#54ACBF] hover:shadow-md"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-[#26658C]">
              Workers On Duty
            </span>
            <span className="text-xl text-[#54ACBF] transition group-hover:text-[#023859]">
              ♧
            </span>
          </div>

          <h3 className="text-2xl font-bold text-[#011C40]">0</h3>

          <p className="mt-1 text-xs text-[#54ACBF]">
            Office & field personnel
          </p>
        </Link>
      </div>

      {/* QUICK ACCESS NAVIGATION */}
      <div className="rounded-2xl border border-[#54ACBF]/30 bg-white p-5 shadow-sm md:p-6">

        <div className="mb-5">
          <h2 className="text-lg font-bold text-[#011C40]">
            Quick Access
          </h2>

          <p className="mt-1 text-sm text-[#26658C]">
            Navigate quickly to the different modules of the system.
          </p>
        </div>

        {/* EXACTLY TWO ROWS ON DESKTOP */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {navigationItems.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-xl border border-[#54ACBF]/30 bg-[#A7EBF2]/10 px-2 py-4 text-center transition duration-200 hover:-translate-y-0.5 hover:border-[#54ACBF] hover:bg-[#A7EBF2]/40 hover:shadow-sm"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#A7EBF2]/50 text-xl text-[#26658C] transition group-hover:bg-[#26658C] group-hover:text-white">
                {item.icon}
              </span>

              <span className="text-xs font-semibold text-[#023859] transition group-hover:text-[#011C40] sm:text-sm">
                {item.title}
              </span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
