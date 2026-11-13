
"use client";

import { useEffect, useState } from "react";
import Drying from "../drying/page";
import Milling from "../milling/page";
import PalayPurchasing from "../purchasing/page";

const productionTabs = [
  {
    id: "purchasing",
    label: "Purchasing",
    description: "Palay procurement",
    icon: "🛒",
  },
  {
    id: "drying",
    label: "Drying",
    description: "Drying operations",
    icon: "☀️",
  },
  {
    id: "milling",
    label: "Milling",
    description: "Rice production",
    icon: "⚙️",
  },
];

export default function Production() {
  const [activeTab, setActiveTab] = useState("purchasing");

  useEffect(() => {
    const requestedTab = new URLSearchParams(
      window.location.search
    ).get("tab");

    if (productionTabs.some((tab) => tab.id === requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, []);

  function selectTab(tab) {
    setActiveTab(tab);

    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);

    window.history.replaceState(null, "", url);
  }

  const activeTabInfo = productionTabs.find(
    (tab) => tab.id === activeTab
  );

  return (
    <main className="min-h-screen bg-[#F3F8FA] p-3 text-[#011C40] sm:p-5 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-5">

        {/* PAGE HEADER */}
        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-[9px] font-extrabold tracking-[1.5px] text-[#54ACBF]">
              RICE MILL MANAGEMENT
            </p>

            <h1 className="text-xl font-serif tracking-tight text-[#011C40] sm:text-2xl">
              Production
            </h1>

            <p className="mt-1 text-[12px] text-[#26658C]">
              Manage palay purchasing, drying, and milling operations
              in one centralized workspace.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start rounded-xl border border-[#54ACBF]/25 bg-white px-4 py-3 shadow-sm sm:self-auto">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A7EBF2]/40 text-lg text-[#26658C]">
              🌾
            </div>

            <div>
              <p className="text-[10px] font-medium text-[#26658C]">
                Production Workflow
              </p>

              <p className="mt-0.5 text-sm font-bold text-[#011C40]">
                3 Processing Stages
              </p>
            </div>
          </div>
        </header>

        {/* PRODUCTION MANAGEMENT */}
        <section className="overflow-hidden rounded-2xl border border-[#54ACBF]/25 bg-white shadow-sm">

          {/* SECTION HEADER */}
          <div className="flex flex-col gap-3 border-b border-[#A7EBF2]/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-base font-bold text-[#011C40]">
                Production Management
              </h2>

              <p className="mt-1 text-[11px] text-[#26658C]">
                Select a processing stage to manage its records.
              </p>
            </div>

            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#54ACBF]/25 bg-[#A7EBF2]/20 px-3 py-1.5 text-[10px] font-bold text-[#023859]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#54ACBF]" />
              {activeTabInfo?.label || "Purchasing"}
            </span>
          </div>

          {/* PRODUCTION TABS */}
          <nav
            aria-label="Production stages"
            className="border-b border-[#A7EBF2]/50 bg-[#A7EBF2]/10 px-3 pt-3 sm:px-5"
          >
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {productionTabs.map((tab) => {
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => selectTab(tab.id)}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative flex min-w-[125px] flex-1 items-center justify-center gap-2 rounded-t-xl border border-b-0 px-3 py-3 text-left transition sm:min-w-[160px] sm:justify-start sm:px-4 ${
                      isActive
                        ? "border-[#54ACBF]/40 bg-white text-[#023859]"
                        : "border-transparent bg-transparent text-[#26658C] hover:border-[#54ACBF]/20 hover:bg-white/70"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${
                        isActive
                          ? "bg-[#A7EBF2]/50"
                          : "bg-[#A7EBF2]/20"
                      }`}
                    >
                      {tab.icon}
                    </span>

                    <span className="min-w-0">
                      <span className="block whitespace-nowrap text-[11px] font-bold sm:text-xs">
                        {tab.label}
                      </span>

                      <span
                        className={`mt-0.5 hidden whitespace-nowrap text-[9px] sm:block ${
                          isActive
                            ? "text-[#26658C]"
                            : "text-slate-400"
                        }`}
                      >
                        {tab.description}
                      </span>
                    </span>

                    {isActive && (
                      <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-t-full bg-[#023859]" />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* ACTIVE TAB CONTENT */}
          <div className="min-w-0">
            {activeTab === "purchasing" && <PalayPurchasing />}
            {activeTab === "drying" && <Drying />}
            {activeTab === "milling" && <Milling />}
          </div>
        </section>
      </div>
    </main>
  );
}
