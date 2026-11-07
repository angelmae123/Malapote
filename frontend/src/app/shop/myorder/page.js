
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "../../../lib/api";
import ShopLogoutButton from "../ShopLogoutButton";

const NAVIGATION = [
  { label: "Shop", href: "/shop/home", icon: "shop" },
  { label: "Cart", href: "/shop/cart", icon: "cart" },
  { label: "My Orders", href: "/shop/myorder", icon: "orders" },
  { label: "Profile", href: "/shop/profile", icon: "profile" },
];

const ORDER_STATUSES = ["Pending", "Processing", "Delivered"];

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
  });
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(String(value).replace(" ", "T"));

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatShortDate(value) {
  if (!value) return "—";

  const date = new Date(String(value).replace(" ", "T"));

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatQuantity(item) {
  const quantity = Number(item.quantity || 0);
  const sackSize = Number(item.sack_size_kg || 0);
  const unitType = String(item.unit_type || "").toLowerCase();

  if (unitType === "kg" || sackSize === 0) {
    return `${quantity.toLocaleString("en-PH")} kg`;
  }

  return `${quantity.toLocaleString("en-PH")} sack(s)`;
}

function getItemWeight(item) {
  const quantity = Number(item.quantity || 0);
  const sackSize = Number(item.sack_size_kg || 0);
  const unitType = String(item.unit_type || "").toLowerCase();

  if (unitType === "kg" || sackSize === 0) {
    return `${quantity.toLocaleString("en-PH")} kg`;
  }

  return `${(quantity * sackSize).toLocaleString("en-PH")} kg total`;
}

function getStatusStyle(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "pending") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (normalized === "processing") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (normalized === "delivered") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (normalized === "cancelled") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function getStatusDescription(status) {
  const normalized = String(status || "").toLowerCase();

  switch (normalized) {
    case "pending":
      return "Your order has been received and is waiting for confirmation.";

    case "processing":
      return "Your order is being prepared by Malapote RiceMill.";

    case "delivered":
      return "Your order has been marked as delivered.";

    case "cancelled":
      return "This order has been cancelled.";

    default:
      return "Your order status will be updated here.";
  }
}

function getStatusStep(status) {
  const index = ORDER_STATUSES.findIndex(
    (item) => item.toLowerCase() === String(status || "").toLowerCase()
  );

  return index < 0 ? 0 : index;
}

function getOrderSubtotal(items) {
  if (!Array.isArray(items)) return 0;

  return items.reduce(
    (total, item) =>
      total +
      Number(
        item.subtotal ??
          Number(item.unit_price || item.price || 0) *
            Number(item.quantity || 0)
      ),
    0
  );
}

function NavIcon({ name, className = "h-5 w-5" }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  switch (name) {
    case "shop":
      return (
        <svg {...common}>
          <path d="M3 10h18l-1.5-6h-15L3 10Z" />
          <path d="M5 10v10h14V10" />
          <path d="M9 20v-6h6v6" />
          <path d="M3 10c0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0" />
        </svg>
      );

    case "cart":
      return (
        <svg {...common}>
          <circle cx="9" cy="20" r="1.5" />
          <circle cx="18" cy="20" r="1.5" />
          <path d="M2 3h2l2.5 12h12L21 7H5" />
        </svg>
      );

    case "orders":
      return (
        <svg {...common}>
          <path d="M5 3h14v18H5z" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      );

    case "profile":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7" />
        </svg>
      );

    default:
      return null;
  }
}

function StatusTracker({ status }) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "cancelled") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2 text-sm font-extrabold text-red-700">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100">
            ×
          </span>
          Order Cancelled
        </div>

        <p className="mt-2 text-xs leading-5 text-red-600">
          This order has been cancelled. Please contact the shop if you need
          more information.
        </p>
      </div>
    );
  }

  const currentStep = getStatusStep(status);

  return (
    <div className="rounded-xl border border-[#e7edf6] bg-[#f8faff] p-4">
      <h4 className="mb-5 text-xs font-extrabold uppercase tracking-wider text-slate-500">
        Order Progress
      </h4>

      <div className="relative grid grid-cols-3">
        <div className="absolute left-[16.5%] right-[16.5%] top-[13px] h-[3px] bg-slate-200" />

        <div
          className="absolute left-[16.5%] top-[13px] h-[3px] bg-[#2863ee] transition-all"
          style={{
            width: `${(currentStep / 2) * 67}%`,
          }}
        />

        {ORDER_STATUSES.map((step, index) => {
          const completed = index <= currentStep;

          return (
            <div
              key={step}
              className="relative z-10 flex flex-col items-center text-center"
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-extrabold ${
                  completed
                    ? "border-[#2863ee] bg-[#2863ee] text-white"
                    : "border-slate-300 bg-white text-slate-400"
                }`}
              >
                {completed ? "✓" : index + 1}
              </div>

              <span
                className={`mt-2 text-[10px] font-bold sm:text-xs ${
                  completed ? "text-[#2458d8]" : "text-slate-400"
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-center text-xs leading-5 text-slate-500">
        {getStatusDescription(status)}
      </p>
    </div>
  );
}

function OrderItems({ items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <p className="text-xs text-slate-400">
        No product details available.
      </p>
    );
  }

  return (
    <div className="divide-y divide-[#edf1f7]">
      {items.map((item, index) => {
        const itemName = item.product_name || item.name || "Rice Product";
        const quantity = Number(item.quantity || 0);
        const price = Number(item.unit_price || item.price || 0);
        const itemSubtotal = Number(
          item.subtotal ?? price * quantity
        );
        const sackSize = Number(item.sack_size_kg || 0);

        return (
          <div
            key={`${item.product_id || itemName}-${index}`}
            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-slate-800">
                {itemName}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {formatQuantity(item)}
                {sackSize > 0
                  ? ` · ${sackSize} kg per sack`
                  : " · Loose rice"}
              </p>

              <p className="mt-1 text-[11px] text-slate-400">
                {getItemWeight(item)}
              </p>

              <p className="mt-1 text-[11px] text-slate-500">
                {formatCurrency(price)} each
              </p>
            </div>

            <p className="shrink-0 text-sm font-extrabold text-[#17345c]">
              {formatCurrency(itemSubtotal)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function OrderDetails({ order, items }) {
  const subtotal = getOrderSubtotal(items);

  return (
    <div className="border-t border-[#e8edf5] bg-[#fbfcff] p-4 sm:p-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <section>
            <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Products Ordered
            </h3>

            <OrderItems items={items} />
          </section>

          <section className="rounded-xl border border-[#e8edf5] bg-white p-4">
            <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Delivery Information
            </h3>

            <div className="space-y-2.5 text-xs">
              <div>
                <p className="text-slate-400">Recipient</p>
                <p className="mt-0.5 font-bold text-slate-800">
                  {order.customer_name || "—"}
                </p>
              </div>

              <div>
                <p className="text-slate-400">Contact Number</p>
                <p className="mt-0.5 font-semibold text-slate-700">
                  {order.contact_number || "—"}
                </p>
              </div>

              {order.email && (
                <div>
                  <p className="text-slate-400">Email</p>
                  <p className="mt-0.5 font-semibold text-slate-700">
                    {order.email}
                  </p>
                </div>
              )}

              <div>
                <p className="text-slate-400">Delivery Address</p>
                <p className="mt-0.5 font-semibold leading-5 text-slate-700">
                  {order.delivery_address || "—"}
                </p>

                <p className="mt-1 font-semibold text-slate-700">
                  {[order.barangay, order.municipality]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </p>
              </div>

              {order.order_notes && (
                <div>
                  <p className="text-slate-400">Order Notes</p>
                  <p className="mt-0.5 leading-5 text-slate-700">
                    {order.order_notes}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <StatusTracker status={order.status || "Pending"} />

          <section className="rounded-xl border border-[#e8edf5] bg-white p-4">
            <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Payment & Summary
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Payment Method</span>
                <span className="text-right font-bold text-slate-800">
                  {order.payment_method || "—"}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Payment Status</span>
                <span
                  className={`rounded-full px-2.5 py-1 font-bold ${
                    order.payment_status === "Paid"
                      ? "bg-green-50 text-green-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {order.payment_status || "Unpaid"}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Shipping Fee</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(order.shipping_fee)}
                </span>
              </div>

              <div className="border-t border-[#e8edf5] pt-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-extrabold text-slate-700">
                    Total Amount
                  </span>

                  <span className="text-lg font-extrabold text-[#2458d8]">
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function OrderRow({ order }) {
  const [expanded, setExpanded] = useState(false);

  const status = order.status || "Pending";

  const items = Array.isArray(order.items_ordered)
    ? order.items_ordered
    : [];

  const itemCount = items.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );

  return (
    <article className="overflow-hidden rounded-xl border border-[#e0e8f4] bg-white shadow-sm transition hover:border-[#cbdaf3]">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-all text-sm font-extrabold text-[#17345c]">
              {order.order_code || `Order #${order.id}`}
            </h3>

            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${getStatusStyle(
                status
              )}`}
            >
              {status}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>{formatShortDate(order.order_date)}</span>
            <span className="hidden text-slate-300 sm:inline">•</span>
            <span>
              {itemCount} item{itemCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-[#edf1f7] pt-3 sm:min-w-[220px] sm:justify-end sm:border-0 sm:pt-0">
          <div className="sm:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Total Amount
            </p>

            <p className="mt-1 text-base font-extrabold text-[#17345c]">
              {formatCurrency(order.total_amount)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setExpanded((previous) => !previous)}
            aria-expanded={expanded}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#dce5f2] bg-white px-3 py-2 text-xs font-bold text-[#2458d8] transition hover:bg-blue-50"
          >
            {expanded ? "Hide Details" : "View Details"}
            <span
              className={`transition-transform ${
                expanded ? "rotate-180" : ""
              }`}
            >
              ↓
            </span>
          </button>
        </div>
      </div>

      {expanded && (
        <OrderDetails order={order} items={items} />
      )}
    </article>
  );
}

export default function MyOrderPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest("shop/my-orders");

      const result = Array.isArray(response)
        ? response
        : response?.orders ??
          response?.data?.orders ??
          response?.data ??
          [];

      if (!Array.isArray(result)) {
        throw new Error("Unexpected response received from the server.");
      }

      setOrders(result);
    } catch (err) {
      console.error("My orders error:", err);

      setError(
        err.message ||
          "Unable to load your orders. Please try again."
      );

      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const pendingCount = orders.filter(
    (order) => String(order.status).toLowerCase() === "pending"
  ).length;

  const processingCount = orders.filter(
    (order) => String(order.status).toLowerCase() === "processing"
  ).length;

  const deliveredCount = orders.filter(
    (order) => String(order.status).toLowerCase() === "delivered"
  ).length;

  return (
    <main className="min-h-screen bg-[#f1f5fd] pb-24 text-[#17345c] lg:pb-0">
      {/* DESKTOP HEADER */}
      <header className="sticky top-0 z-30 hidden border-b border-[#e2e9f5] bg-white/95 backdrop-blur lg:block">
        <div className="mx-auto grid h-[76px] max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-6 px-5 sm:px-8">
          <Link
            href="/shop/home"
            className="flex shrink-0 items-center gap-3"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2458d8] text-lg font-black text-white">
              M
            </span>

            <span>
              <span className="block text-sm font-extrabold tracking-wide">
                MALAPOTE
              </span>

              <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Rice marketplace
              </span>
            </span>
          </Link>

          <nav
            aria-label="Customer navigation"
            className="flex h-full items-center justify-self-center gap-2"
          >
            {NAVIGATION.map((item) => {
              const active = item.label === "My Orders";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-full items-center gap-2 border-b-[3px] px-4 pt-[3px] text-sm font-bold transition ${
                    active
                      ? "border-[#2863ee] text-[#2458d8]"
                      : "border-transparent text-slate-500 hover:border-blue-200 hover:text-[#2458d8]"
                  }`}
                >
                  <NavIcon
                    name={item.icon}
                    className="h-[18px] w-[18px]"
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <ShopLogoutButton className="justify-self-end" />
        </div>
      </header>

      {/* MOBILE HEADER */}
      <header className="sticky top-0 z-30 border-b border-[#e2e9f5] bg-white/95 backdrop-blur lg:hidden">
        <div className="flex h-[64px] items-center justify-between px-5">
          <Link href="/shop/home" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2458d8] text-base font-black text-white">
              M
            </span>

            <span>
              <span className="block text-sm font-extrabold tracking-wide">
                MALAPOTE
              </span>

              <span className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Rice marketplace
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#2458d8]">
              My Orders
            </span>
            <ShopLogoutButton className="px-2 text-xs" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 pb-12 pt-8 sm:px-8 sm:pt-10">
        {/* PAGE TITLE */}
        <section className="mb-7">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#2863ee]">
            Your purchase history
          </p>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                My Orders
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Track your orders and check their latest delivery status.
              </p>
            </div>

            <button
              type="button"
              onClick={loadOrders}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#dce5f2] bg-white px-4 py-2.5 text-xs font-bold text-[#2458d8] transition hover:bg-blue-50 disabled:opacity-50"
            >
              <span>↻</span>
              {loading ? "Refreshing..." : "Refresh Orders"}
            </button>
          </div>
        </section>

        {/* SUMMARY */}
        {!loading && !error && orders.length > 0 && (
          <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-[#e0e8f4] bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">
                Total Orders
              </p>

              <p className="mt-2 text-2xl font-extrabold text-[#17345c]">
                {orders.length}
              </p>
            </div>

            <div className="rounded-xl border border-amber-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">
                Pending
              </p>

              <p className="mt-2 text-2xl font-extrabold text-amber-600">
                {pendingCount}
              </p>
            </div>

            <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">
                Processing
              </p>

              <p className="mt-2 text-2xl font-extrabold text-blue-600">
                {processingCount}
              </p>
            </div>

            <div className="rounded-xl border border-green-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">
                Delivered
              </p>

              <p className="mt-2 text-2xl font-extrabold text-green-600">
                {deliveredCount}
              </p>
            </div>
          </section>
        )}

        {/* ORDER HISTORY */}
        <section>
          {!loading && !error && orders.length > 0 && (
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-[#17345c]">
                Order History
              </h2>

              <span className="text-xs text-slate-400">
                {orders.length} order{orders.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* LOADING */}
          {loading && (
            <div className="rounded-xl border border-[#e0e8f4] bg-white px-6 py-16 text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-[#2863ee]" />

              <p className="mt-4 text-sm font-semibold text-slate-500">
                Loading your orders...
              </p>
            </div>
          )}

          {/* ERROR */}
          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-white px-6 py-12 text-center">
              <p className="font-extrabold text-red-700">
                Unable to load your orders
              </p>

              <p className="mt-2 text-sm text-slate-500">
                {error}
              </p>

              <button
                type="button"
                onClick={loadOrders}
                className="mt-5 rounded-xl bg-[#2863ee] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#174fcf]"
              >
                Try Again
              </button>
            </div>
          )}

          {/* EMPTY ORDERS */}
          {!loading && !error && orders.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#cfd9e8] bg-white px-6 py-16 text-center">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-[#2863ee]">
                <NavIcon name="orders" className="h-9 w-9" />
              </div>

              <h2 className="text-xl font-extrabold">
                No orders yet
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                You haven&apos;t placed an order yet. Your purchases will
                appear here once you complete checkout.
              </p>

              <Link
                href="/shop/home"
                className="mt-6 inline-flex rounded-xl bg-[#2863ee] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#174fcf]"
              >
                Browse Rice Products
              </Link>
            </div>
          )}

          {/* COMPACT ORDER LIST */}
          {!loading && !error && orders.length > 0 && (
            <div className="space-y-3">
              {orders.map((order) => (
                <OrderRow
                  key={order.id || order.order_code}
                  order={order}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav
        aria-label="Mobile customer navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e0e8f4] bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_18px_rgba(24,56,107,0.07)] backdrop-blur lg:hidden"
      >
        <div className="grid grid-cols-4">
          {NAVIGATION.map((item) => {
            const active = item.label === "My Orders";

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[65px] flex-col items-center justify-center gap-1 text-[10px] font-bold transition ${
                  active
                    ? "text-[#2458d8]"
                    : "text-slate-400 hover:text-[#2458d8]"
                }`}
              >
                <NavIcon name={item.icon} className="h-5 w-5" />
                <span>{item.label}</span>

                {active && (
                  <span className="absolute bottom-[3px] h-1 w-5 rounded-full bg-[#2863ee]" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
