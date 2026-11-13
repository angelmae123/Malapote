
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "../../../lib/api";
import ShopLogoutButton from "../ShopLogoutButton";

const navigation = [
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
    return "border-[#54ACBF]/40 bg-[#A7EBF2]/30 text-[#023859]";
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
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <div className="flex items-center gap-3 text-sm font-bold text-red-700">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-lg">
            ×
          </span>

          <div>
            <p>Order Cancelled</p>
            <p className="mt-0.5 text-[11px] font-medium text-red-500">
              This order is no longer being processed.
            </p>
          </div>
        </div>

        <p className="mt-3 text-xs leading-5 text-red-600">
          This order has been cancelled. Please contact the shop if you need
          more information.
        </p>
      </div>
    );
  }

  const currentStep = getStatusStep(status);

  return (
    <div className="rounded-2xl border border-[#54ACBF]/25 bg-[#F3F8FA] p-5">
      <div className="mb-6 flex items-center justify-between">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#023859]">
          Order Progress
        </h4>

        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold text-[#26658C]">
          Step {currentStep + 1} of 3
        </span>
      </div>

      <div className="relative grid grid-cols-3">
        <div className="absolute left-[16.5%] right-[16.5%] top-[13px] h-[3px] rounded-full bg-[#dce7eb]" />

        <div
          className="absolute left-[16.5%] top-[13px] h-[3px] rounded-full bg-[#023859] transition-all duration-500"
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
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-bold transition ${
                  completed
                    ? "border-[#023859] bg-[#023859] text-white"
                    : "border-slate-300 bg-white text-slate-400"
                }`}
              >
                {completed ? "✓" : index + 1}
              </div>

              <span
                className={`mt-2 text-[10px] font-bold sm:text-xs ${
                  completed ? "text-[#023859]" : "text-slate-400"
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-center text-xs leading-5 text-[#26658C]">
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
    <div className="divide-y divide-[#A7EBF2]/40">
      {items.map((item, index) => {
        const itemName = item.product_name || item.name || "Rice Product";
        const quantity = Number(item.quantity || 0);
        const price = Number(item.unit_price || item.price || 0);
        const itemSubtotal = Number(item.subtotal ?? price * quantity);
        const sackSize = Number(item.sack_size_kg || 0);

        return (
          <div
            key={`${item.product_id || itemName}-${index}`}
            className="flex items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#011C40]">
                {itemName}
              </p>

              <p className="mt-1 text-xs text-[#26658C]">
                {formatQuantity(item)}
                {sackSize > 0
                  ? ` · ${sackSize} kg per sack`
                  : " · Loose rice"}
              </p>

              <p className="mt-1 text-[11px] text-slate-400">
                {getItemWeight(item)}
              </p>

              <p className="mt-1 text-xs font-medium text-[#26658C]">
                {formatCurrency(price)} each
              </p>
            </div>

            <p className="shrink-0 text-sm font-extrabold text-[#023859]">
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
    <div className="border-t border-[#54ACBF]/25 bg-[#F3F8FA] p-4 sm:p-6">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          {/* PRODUCTS ORDERED */}
          <section className="rounded-2xl border border-[#54ACBF]/25 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#A7EBF2]/30 text-[#023859]">
                <NavIcon name="shop" className="h-4 w-4" />
              </span>

              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#023859]">
                  Products Ordered
                </h3>

                <p className="mt-0.5 text-[10px] text-[#26658C]">
                  Items included in this order
                </p>
              </div>
            </div>

            <OrderItems items={items} />
          </section>

          {/* DELIVERY INFORMATION */}
          <section className="rounded-2xl border border-[#54ACBF]/25 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#A7EBF2]/30 text-[#023859]">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
              </span>

              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#023859]">
                  Delivery Information
                </h3>

                <p className="mt-0.5 text-[10px] text-[#26658C]">
                  Where your order will be delivered
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-slate-400">Recipient</p>
                <p className="mt-1 font-bold text-[#011C40]">
                  {order.customer_name || "—"}
                </p>
              </div>

              <div>
                <p className="text-slate-400">Contact Number</p>
                <p className="mt-1 font-semibold text-[#26658C]">
                  {order.contact_number || "—"}
                </p>
              </div>

              {order.email && (
                <div>
                  <p className="text-slate-400">Email Address</p>
                  <p className="mt-1 break-all font-semibold text-[#26658C]">
                    {order.email}
                  </p>
                </div>
              )}

              <div>
                <p className="text-slate-400">Delivery Address</p>
                <p className="mt-1 font-semibold leading-5 text-[#26658C]">
                  {order.delivery_address || "—"}
                </p>

                <p className="mt-1 font-semibold text-[#26658C]">
                  {[order.barangay, order.municipality]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </p>
              </div>

              {order.order_notes && (
                <div className="rounded-xl bg-[#F3F8FA] p-3">
                  <p className="font-bold text-[#26658C]">Order Notes</p>
                  <p className="mt-1 leading-5 text-slate-600">
                    {order.order_notes}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <StatusTracker status={order.status || "Pending"} />

          {/* PAYMENT SUMMARY */}
          <section className="rounded-2xl border border-[#54ACBF]/25 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#A7EBF2]/30 text-[#023859]">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 10h18M7 15h3" />
                </svg>
              </span>

              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#023859]">
                  Payment & Summary
                </h3>

                <p className="mt-0.5 text-[10px] text-[#26658C]">
                  Order payment breakdown
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-[#26658C]">Payment Method</span>
                <span className="text-right font-bold text-[#011C40]">
                  {order.payment_method || "—"}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-[#26658C]">Payment Status</span>

                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                    String(order.payment_status || "").toLowerCase() === "paid"
                      ? "bg-green-50 text-green-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {order.payment_status || "Unpaid"}
                </span>
              </div>

              <div className="border-t border-dashed border-[#54ACBF]/30 pt-4">
                <div className="flex justify-between gap-3">
                  <span className="text-[#26658C]">Subtotal</span>
                  <span className="font-semibold text-[#011C40]">
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                <div className="mt-3 flex justify-between gap-3">
                  <span className="text-[#26658C]">Shipping Fee</span>
                  <span className="font-semibold text-[#011C40]">
                    {formatCurrency(order.shipping_fee)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-[#023859] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-white/80">
                    Total Amount
                  </span>

                  <span className="text-lg font-extrabold text-white">
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
    <article className="overflow-hidden rounded-2xl border border-[#54ACBF]/25 bg-white shadow-[0_3px_14px_rgba(1,28,64,0.04)] transition duration-200 hover:border-[#54ACBF]/60 hover:shadow-md">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#A7EBF2]/30 text-[#023859]">
              <NavIcon name="orders" className="h-4 w-4" />
            </span>

            <h3 className="break-all text-sm font-extrabold text-[#011C40]">
              {order.order_code || `Order #${order.id}`}
            </h3>

            <span
              className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold ${getStatusStyle(
                status
              )}`}
            >
              {status}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#26658C]">
            <span>{formatShortDate(order.order_date)}</span>
            <span className="text-slate-300">•</span>
            <span>
              {itemCount} item{itemCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-[#A7EBF2]/40 pt-4 sm:min-w-[245px] sm:justify-end sm:border-0 sm:pt-0">
          <div className="sm:text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Amount
            </p>

            <p className="mt-1 text-lg font-extrabold text-[#023859]">
              {formatCurrency(order.total_amount)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setExpanded((previous) => !previous)}
            aria-expanded={expanded}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition ${
              expanded
                ? "border-[#023859] bg-[#023859] text-white"
                : "border-[#54ACBF]/35 bg-white text-[#023859] hover:bg-[#A7EBF2]/25"
            }`}
          >
            {expanded ? "Hide Details" : "View Details"}

            <svg
              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                expanded ? "rotate-180" : ""
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      {expanded && <OrderDetails order={order} items={items} />}
    </article>
  );
}

function SummaryCard({ label, count, type }) {
  const styles = {
    total: {
      iconBg: "bg-[#A7EBF2]/30",
      iconColor: "text-[#023859]",
      number: "text-[#011C40]",
      border: "border-[#54ACBF]/25",
    },
    pending: {
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      number: "text-amber-600",
      border: "border-amber-100",
    },
    processing: {
      iconBg: "bg-[#A7EBF2]/30",
      iconColor: "text-[#26658C]",
      number: "text-[#26658C]",
      border: "border-[#54ACBF]/30",
    },
    delivered: {
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      number: "text-green-600",
      border: "border-green-100",
    },
  };

  const style = styles[type];

  return (
    <div
      className={`rounded-2xl border ${style.border} bg-white p-4 shadow-[0_3px_14px_rgba(1,28,64,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-[#26658C]">{label}</p>

        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${style.iconBg} ${style.iconColor}`}
        >
          {type === "total" && (
            <NavIcon name="orders" className="h-4 w-4" />
          )}

          {type === "pending" && (
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          )}

          {type === "processing" && (
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 7v5h-5" />
              <path d="M4 17v-5h5" />
              <path d="M5.6 9a7 7 0 0 1 11.5-2L20 12" />
              <path d="M18.4 15a7 7 0 0 1-11.5 2L4 12" />
            </svg>
          )}

          {type === "delivered" && (
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m5 12 4 4L19 6" />
            </svg>
          )}
        </span>
      </div>

      <p className={`mt-3 text-2xl font-extrabold ${style.number}`}>
        {count}
      </p>

      <p className="mt-1 text-[10px] text-slate-400">
        {type === "total" ? "All your purchases" : `${label} orders`}
      </p>
    </div>
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
    <main className="min-h-screen bg-[#F3F8FA] pb-28 text-[#011C40] lg:pb-0">

      {/* DESKTOP HEADER */}
      <header className="sticky top-0 z-30 hidden border-b border-[#54ACBF]/25 bg-white/95 shadow-sm backdrop-blur lg:block">
        <div className="mx-auto grid h-[76px] max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-5 sm:px-8">

          {/* LOGO */}
          <Link
            href="/shop/home"
            className="flex shrink-0 items-center gap-3 justify-self-start"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#023859] text-lg font-black text-white shadow-sm">
              M
            </span>

            <span>
              <span className="block text-sm font-extrabold tracking-wide text-[#011C40]">
                MALAPOTE
              </span>

              <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#26658C]">
                Rice marketplace
              </span>
            </span>
          </Link>

          {/* CENTERED NAVIGATION */}
          <nav
            aria-label="Customer navigation"
            className="flex items-center justify-self-center gap-2"
          >
            {navigation.map((item) => {
              const active = item.label === "My Orders";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-bold transition-all duration-200 ${
                    active
                      ? "bg-[#023859] text-white shadow-sm"
                      : "text-[#26658C] hover:bg-[#A7EBF2]/35 hover:text-[#011C40]"
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

          {/* LOGOUT */}
          <div className="shrink-0 justify-self-end">
            <ShopLogoutButton className="rounded-xl border border-[#54ACBF]/35 px-3 py-2 text-[12px] font-semibold text-[#023859] transition hover:bg-[#A7EBF2]/25" />
          </div>
        </div>
      </header>

      {/* MOBILE HEADER */}
      <header className="sticky top-0 z-30 border-b border-[#54ACBF]/25 bg-white/95 shadow-sm backdrop-blur lg:hidden">
        <div className="flex h-[64px] items-center justify-between px-5">

          {/* LOGO */}
          <Link href="/shop/home" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#023859] text-base font-black text-white">
              M
            </span>

            <span>
              <span className="block text-sm font-extrabold tracking-wide text-[#011C40]">
                MALAPOTE
              </span>

              <span className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#26658C]">
                Rice marketplace
              </span>
            </span>
          </Link>

          {/* CART AND LOGOUT */}
          <div className="flex items-center gap-2">
            <Link
              href="/shop/cart"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-[#26658C] transition hover:bg-[#A7EBF2]/30 hover:text-[#023859]"
            >
              <NavIcon name="cart" className="h-4 w-4" />
              Cart
            </Link>

            <ShopLogoutButton className="rounded-lg px-2 py-2 text-xs text-[#26658C] hover:bg-[#A7EBF2]/30" />
          </div>
        </div>
      </header>

      {/* PAGE CONTENT */}
      <div className="mx-auto max-w-7xl px-5 pb-12 pt-7 sm:px-8 sm:pt-9">

        {/* PAGE TITLE */}
        <section aria-labelledby="orders-title" className="mb-6">
          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[1.5px] text-[#54ACBF]">
            Your purchase history
          </p>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1
                id="orders-title"
                className="text-2xl font-serif font-bold tracking-tight text-[#011C40] sm:text-3xl"
              >
                My Orders
              </h1>

              <p className="mt-1.5 max-w-xl text-sm leading-6 text-[#26658C]">
                Track your orders, review your purchases, and check their
                latest delivery status.
              </p>
            </div>

            <button
              type="button"
              onClick={loadOrders}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#023859] px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#011C40] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
            >
              <svg
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 7v5h-5" />
                <path d="M4 17v-5h5" />
                <path d="M5.6 9a7 7 0 0 1 11.5-2L20 12" />
                <path d="M18.4 15a7 7 0 0 1-11.5 2L4 12" />
              </svg>

              {loading ? "Refreshing..." : "Refresh Orders"}
            </button>
          </div>
        </section>

        {/* SUMMARY CARDS */}
        {!loading && !error && orders.length > 0 && (
          <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <SummaryCard
              label="Total Orders"
              count={orders.length}
              type="total"
            />

            <SummaryCard
              label="Pending"
              count={pendingCount}
              type="pending"
            />

            <SummaryCard
              label="Processing"
              count={processingCount}
              type="processing"
            />

            <SummaryCard
              label="Delivered"
              count={deliveredCount}
              type="delivered"
            />
          </section>
        )}

        {/* ORDER HISTORY */}
        <section>
          {!loading && !error && orders.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-extrabold text-[#011C40]">
                  Order History
                </h2>

                <p className="mt-1 text-xs text-[#26658C]">
                  View the details of your previous purchases.
                </p>
              </div>

              <span className="rounded-full border border-[#54ACBF]/25 bg-white px-3 py-1.5 text-[10px] font-bold text-[#26658C]">
                {orders.length} order{orders.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* LOADING */}
          {loading && (
            <div className="rounded-2xl border border-[#54ACBF]/25 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#A7EBF2] border-t-[#023859]" />

              <p className="mt-4 text-sm font-bold text-[#26658C]">
                Loading your orders...
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Please wait while we retrieve your purchase history.
              </p>
            </div>
          )}

          {/* ERROR */}
          {!loading && error && (
            <div className="rounded-2xl border border-red-200 bg-white px-6 py-14 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                <svg
                  className="h-7 w-7"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5M12 16h.01" />
                </svg>
              </div>

              <h2 className="mt-4 text-base font-extrabold text-red-700">
                Unable to load your orders
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {error}
              </p>

              <button
                type="button"
                onClick={loadOrders}
                className="mt-5 rounded-xl bg-[#023859] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#011C40]"
              >
                Try Again
              </button>
            </div>
          )}

          {/* EMPTY ORDERS */}
          {!loading && !error && orders.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#54ACBF]/40 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#A7EBF2]/30 text-[#023859]">
                <NavIcon name="orders" className="h-9 w-9" />
              </div>

              <h2 className="text-xl font-extrabold text-[#011C40]">
                No orders yet
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#26658C]">
                You haven&apos;t placed an order yet. Your purchases will
                appear here once you complete checkout.
              </p>

              <Link
                href="/shop/home"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#023859] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#011C40]"
              >
                <NavIcon name="shop" className="h-4 w-4" />
                Browse Rice Products
              </Link>
            </div>
          )}

          {/* ORDER LIST */}
          {!loading && !error && orders.length > 0 && (
            <div className="space-y-4">
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

      {/* MOBILE FLOATING BOTTOM NAVIGATION */}
      <nav
        aria-label="Mobile customer navigation"
        className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md rounded-2xl border border-[#54ACBF]/30 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_8px_30px_rgba(1,28,64,0.16)] backdrop-blur lg:hidden"
      >
        <div className="grid grid-cols-4 gap-1">
          {navigation.map((item) => {
            const active = item.label === "My Orders";

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[65px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold transition-all duration-200 ${
                  active
                    ? "bg-[#023859] text-white shadow-sm"
                    : "text-[#26658C] hover:bg-[#A7EBF2]/25"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                    active
                      ? "bg-[#A7EBF2]/20 text-[#A7EBF2]"
                      : "text-[#26658C]"
                  }`}
                >
                  <NavIcon name={item.icon} className="h-5 w-5" />
                </span>

                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
