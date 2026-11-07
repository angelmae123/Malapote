
"use client";

import { useEffect, useState } from "react";
import Drying from "../drying/page";
import Milling from "../milling/page";
import PalayPurchasing from "../purchasing/page";

const productionTabs = [
  { id: "purchasing", label: "Purchasing" },
  { id: "drying", label: "Drying" },
  { id: "milling", label: "Milling" },
];

export default function Production() {
  const [activeTab, setActiveTab] = useState("purchasing");

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");

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

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Page Header */}
        <header>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-900">
            Rice Mill Management
          </p>

          <h1 className="mt-2 font-serif text-3xl font-semibold text-slate-900">
            Production
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage palay purchasing, drying, and milling from one workspace.
          </p>
        </header>

        {/* Production Tabs */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <nav
            aria-label="Production stages"
            className="flex overflow-x-auto border-b border-slate-200"
          >
            {productionTabs.map((tab) => {
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => selectTab(tab.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative min-w-30 px-5 py-4 text-sm font-semibold transition sm:min-w-37.5 ${
                    isActive
                      ? "text-blue-900"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  {tab.label}

                  {isActive && (
                    <span className="absolute inset-x-0 bottom-0 h-0.75 rounded-t-full bg-blue-900" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Active Tab Content */}
          <div className="p-3 sm:p-5">
            {activeTab === "purchasing" && <PalayPurchasing />}
            {activeTab === "drying" && <Drying />}
            {activeTab === "milling" && <Milling />}
          </div>
        </section>
      </div>
    </main>
  );
}
