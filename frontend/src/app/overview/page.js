"use client";

import Link from "next/link";

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-8">
      
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
            Malapote Ricemill System
          </span>
          <h1 className="text-3xl font-serif font-normal text-slate-900 mt-3">
            Welcome to your workspace.
          </h1>
          <p className="text-slate-600 text-sm mt-1 max-w-xl">
            Manage your harvest operations, inventory flow, milling processes, and office records seamlessly from one centralized platform.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard/mill/production?tab=purchasing" 
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-blue-600/20 transition"
          >
            New Palay Purchase
          </Link>
        </div>
      </div>

      {/* Quick Summary Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-sm mb-2">
            <span>Farm Harvests</span>
            <span className="text-blue-500 text-lg">✳</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">0.00 <span className="text-xs font-normal text-slate-500">bags</span></h3>
          <p className="text-xs text-slate-500 mt-1">Logged for this season</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-sm mb-2">
            <span>Mill Inventory</span>
            <span className="text-blue-500 text-lg">▦</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">0 <span className="text-xs font-normal text-slate-500">stocks</span></h3>
          <p className="text-xs text-slate-500 mt-1">Current milled rice ready</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-sm mb-2">
            <span>Active Orders</span>
            <span className="text-blue-500 text-lg">▧</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">0</h3>
          <p className="text-xs text-slate-500 mt-1">Pending processing</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-sm mb-2">
            <span>Workers On Duty</span>
            <span className="text-blue-500 text-lg">♧</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">0</h3>
          <p className="text-xs text-slate-500 mt-1">Office & field personnel</p>
        </div>

      </div>

      {/* Quick Access Sections / Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Farm Section Preview */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Farm Operations</h2>
          <p className="text-slate-600 text-sm mb-4">Monitor crop activities, inventory stocks, and planting schedules.</p>
          <div className="flex gap-2">
            <Link href="/dashboard/farm/activity" className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-2 rounded-xl transition">
              Activity Logs
            </Link>
            <Link href="/dashboard/farm/planting-harvesting" className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-2 rounded-xl transition">
              Planting & Harvest
            </Link>
          </div>
        </div>

        {/* Mill Section Preview */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Mill Operations</h2>
          <p className="text-slate-600 text-sm mb-4">Track drying stages, milling yields, and palay purchasing records.</p>
          <div className="flex gap-2">
            <Link href="/dashboard/mill/production?tab=drying" className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-2 rounded-xl transition">
              Drying
            </Link>
            <Link href="/dashboard/mill/production?tab=milling" className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-2 rounded-xl transition">
              Milling
            </Link>
            <Link href="/dashboard/mill/production?tab=purchasing" className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-2 rounded-xl transition">
              Palay Purchasing
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}