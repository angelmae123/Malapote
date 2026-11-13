
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../providers";
import { apiRequest } from "../../../../lib/api";
import { toast } from "react-toastify";
import { getLowStockInfo } from "../../../../lib/lowStock";

const ORDER_STATUSES = ["Pending", "Processing", "Delivered", "Cancelled"];

function getResponseData(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.orders)) return response.orders;
  if (Array.isArray(response?.data?.orders)) return response.data.orders;
  return [];
}

function parseOrderItems(value) {
  if (Array.isArray(value)) return value;

  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getItemQuantity(item) {
  return Number(item.quantity || item.qty || 0);
}

function getItemDescription(item) {
  const sackSize = Number(item.sack_size_kg || 0);
  const quantity = getItemQuantity(item);

  if (sackSize > 0) {
    return {
      type: `${sackSize} kg per sack`,
      quantity: `${quantity} sack(s)`,
      weight: `${quantity * sackSize} kg total`,
    };
  }

  return {
    type: "Loose rice",
    quantity: `${quantity} kg`,
    weight: null,
  };
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  });
}

function getStatusStyle(status) {
  const styles = {
    Pending: "border-amber-200 bg-amber-50 text-amber-700",
    Processing: "border-[#54ACBF]/30 bg-[#A7EBF2]/40 text-[#023859]",
    Delivered: "border-green-200 bg-green-50 text-green-700",
    Cancelled: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    styles[status] ||
    "border-slate-200 bg-slate-100 text-slate-600"
  );
}

function getPaymentStatusStyle(status) {
  return status === "Paid"
    ? "border-[#54ACBF]/30 bg-[#A7EBF2]/40 text-[#023859]"
    : "border-amber-200 bg-amber-50 text-amber-700";
}

function SummaryCard({ label, value, description, icon }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-[#54ACBF]/25 bg-white p-4 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A7EBF2]/40 text-[#023859]">
        <span className="text-lg">{icon}</span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-[#26658C]">
          {label}
        </p>

        <p className="mt-0.5 truncate text-xl font-bold text-[#011C40]">
          {value}
        </p>

        <p className="mt-0.5 truncate text-[10px] text-[#26658C]/70">
          {description}
        </p>
      </div>
    </div>
  );
}

function BreakdownItem({
  label,
  value,
  valueClass = "text-[#011C40]",
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#26658C]">
        {label}
      </p>

      <p className={`mt-1 truncate text-sm font-bold ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

function OrderItems({ value }) {
  const items = parseOrderItems(value);

  if (!items.length) {
    return (
      <span className="text-[11px] text-[#26658C]/60">
        {value && typeof value === "string" && !value.trim().startsWith("[")
          ? value
          : "No item details"}
      </span>
    );
  }

  return (
    <div className="min-w-[190px] space-y-2">
      {items.map((item, index) => {
        const details = getItemDescription(item);

        return (
          <div
            key={`${item.product_id || item.product_name || "item"}-${index}`}
            className="rounded-lg border border-[#54ACBF]/20 bg-[#A7EBF2]/10 p-3"
          >
            <p className="text-[11px] font-bold text-[#011C40]">
              {item.product_name || item.name || "Rice Product"}
            </p>

            <p className="mt-1 text-[10px] text-[#26658C]">
              {details.type}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#A7EBF2]/50 px-2.5 py-1 text-[10px] font-bold text-[#023859]">
                {details.quantity}
              </span>

              {details.weight && (
                <span className="text-[10px] text-[#26658C]">
                  {details.weight}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Orders() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [orders, setOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [inventoryWarningError, setInventoryWarningError] = useState("");

  const [selectedStatuses, setSelectedStatuses] = useState({});
  const [selectedPaymentStatuses, setSelectedPaymentStatuses] = useState({});
  const [savingOrders, setSavingOrders] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================================================
  // LOAD ORDERS AND INVENTORY
  // =========================================================

  const loadOrders = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [response, productResult] = await Promise.all([
        apiRequest("sales/orders", { token }),

        apiRequest("sales/products", { token }).then(
          (productResponse) => ({
            data: productResponse,
            error: "",
          }),
          (err) => ({
            data: null,
            error:
              err.message || "Unable to check inventory stock.",
          })
        ),
      ]);

      const orderData = getResponseData(response);
      const productData = getResponseData(productResult.data);

      setOrders(orderData);
      setInventoryWarningError(productResult.error);

      setLowStockProducts(
        productData.filter((product) => getLowStockInfo(product))
      );

      const statusValues = {};
      const paymentStatusValues = {};

      orderData.forEach((order) => {
        statusValues[order.id] = order.status || "Pending";
        paymentStatusValues[order.id] =
          order.payment_status || "Unpaid";
      });

      setSelectedStatuses(statusValues);
      setSelectedPaymentStatuses(paymentStatusValues);
    } catch (err) {
      const message =
        err.message || "Failed to load customer orders.";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // =========================================================
  // ORDER SUMMARY
  // =========================================================

  const summary = useMemo(() => {
    return orders.reduce(
      (result, order) => {
        result.total += 1;

        if (order.status === "Pending") result.pending += 1;
        if (order.status === "Processing") result.processing += 1;
        if (order.status === "Delivered") result.delivered += 1;
        if (order.status === "Cancelled") result.cancelled += 1;

        if (order.payment_status === "Paid") {
          result.paid += 1;
        } else {
          result.unpaid += 1;
        }

        result.revenue += Number(order.total_amount || 0);

        return result;
      },
      {
        total: 0,
        pending: 0,
        processing: 0,
        delivered: 0,
        cancelled: 0,
        paid: 0,
        unpaid: 0,
        revenue: 0,
      }
    );
  }, [orders]);

  // =========================================================
  // SORT ORDERS
  // =========================================================

  const newestOrders = useMemo(
    () =>
      [...orders].sort((a, b) => {
        const idDifference = Number(b.id) - Number(a.id);

        if (Number.isFinite(idDifference) && idDifference !== 0) {
          return idDifference;
        }

        return String(b.order_date || "").localeCompare(
          String(a.order_date || "")
        );
      }),
    [orders]
  );

  // =========================================================
  // STATUS SELECTORS
  // =========================================================

  const handleStatusChange = (orderId, status) => {
    setSelectedStatuses((previous) => ({
      ...previous,
      [orderId]: status,
    }));

    // Delivered orders are automatically marked as Paid.
    if (status === "Delivered") {
      setSelectedPaymentStatuses((previous) => ({
        ...previous,
        [orderId]: "Paid",
      }));
    }
  };

  const handlePaymentStatusChange = (orderId, status) => {
    setSelectedPaymentStatuses((previous) => ({
      ...previous,
      [orderId]: status,
    }));
  };

  // =========================================================
  // SAVE ORDER CHANGES
  // =========================================================

  const saveOrderChanges = async (order) => {
    const orderId = order.id;
    const newStatus = selectedStatuses[orderId];

    const newPaymentStatus =
      newStatus === "Delivered"
        ? "Paid"
        : selectedPaymentStatuses[orderId] || "Unpaid";

    if (!orderId) {
      toast.error("Order ID is missing. Cannot update this order.");
      return;
    }

    if (!ORDER_STATUSES.includes(newStatus)) {
      toast.error("Please select a valid order status.");
      return;
    }

    if (
      ["Delivered", "Cancelled"].includes(order.status) &&
      newStatus !== order.status
    ) {
      toast.error(
        "Delivered or cancelled orders cannot be changed to another status."
      );
      return;
    }

    if (
      newStatus === (order.status || "Pending") &&
      newPaymentStatus === (order.payment_status || "Unpaid")
    ) {
      toast.info(
        "Please change the order status or payment status first."
      );
      return;
    }

    try {
      setSavingOrders((previous) => ({
        ...previous,
        [orderId]: true,
      }));

      await apiRequest(`sales/orders/${orderId}`, {
        method: "PUT",
        token,
        body: {
          order_code: order.order_code,
          mill_inventory_id: order.mill_inventory_id ?? null,
          customer_name: order.customer_name,
          items_ordered: order.items_ordered,
          payment_method: order.payment_method,
          payment_status: newPaymentStatus,
          order_date: order.order_date,
          total_amount: order.total_amount,
          status: newStatus,
          contact_number: order.contact_number ?? null,
          email: order.email ?? null,
          delivery_address: order.delivery_address ?? null,
          municipality: order.municipality ?? null,
          barangay: order.barangay ?? null,
          order_notes: order.order_notes ?? null,
          shipping_fee: order.shipping_fee ?? 0,
        },
      });

      setOrders((previous) =>
        previous.map((item) =>
          item.id === orderId
            ? {
                ...item,
                status: newStatus,
                payment_status: newPaymentStatus,
              }
            : item
        )
      );

      toast.success(
        `Order ${order.order_code} updated successfully.`
      );
    } catch (err) {
      // Restore the original selections when the request fails.
      setSelectedStatuses((previous) => ({
        ...previous,
        [orderId]: order.status || "Pending",
      }));

      setSelectedPaymentStatuses((previous) => ({
        ...previous,
        [orderId]: order.payment_status || "Unpaid",
      }));

      toast.error(err.message || "Failed to update order status.");
    } finally {
      setSavingOrders((previous) => ({
        ...previous,
        [orderId]: false,
      }));
    }
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className="min-h-screen bg-[#F3F8FA] p-3 text-[#011C40] sm:p-5 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-5">

        {/* HEADER */}
        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-[9px] font-extrabold tracking-[1.5px] text-[#54ACBF]">
              SALES MANAGEMENT
            </p>

            <h1 className="font-serif text-xl tracking-tight text-[#011C40] sm:text-2xl">
              Customer Orders
            </h1>

            <p className="mt-1 text-[12px] text-[#26658C]">
              Monitor customer orders, payment status, and delivery progress.
            </p>
          </div>

          <button
            type="button"
            onClick={loadOrders}
            disabled={loading || !token}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#023859] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#011C40] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>↻</span>
            {loading ? "Refreshing..." : "Refresh Orders"}
          </button>
        </header>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[11px] text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="font-bold"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {/* LOW STOCK WARNING */}
        {inventoryWarningError ? (
          <div
            role="status"
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800"
          >
            Could not check for low stock: {inventoryWarningError}
          </div>
        ) : lowStockProducts.length > 0 ? (
          <section
            role="alert"
            className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900"
          >
            <h2 className="text-[12px] font-bold">
              Low Stock Warning ({lowStockProducts.length})
            </h2>

            <p className="mt-1 text-[10px] text-amber-800">
              The following products have reached their low-stock threshold.
            </p>

            <ul className="mt-3 space-y-2">
              {lowStockProducts.map((product) => {
                const lowStock = getLowStockInfo(product);

                return (
                  <li
                    key={product.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-200/70 pt-2 text-[11px]"
                  >
                    <span className="font-semibold">
                      {product.product_name ||
                        product.inventory_item_name ||
                        "Rice"}
                    </span>

                    <span>
                      {Number(lowStock.quantity).toLocaleString("en-PH")}{" "}
                      {lowStock.unit} remaining
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {/* ORDER SUMMARY */}
        <section className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SummaryCard
              label="Total Orders"
              value={summary.total.toLocaleString("en-PH")}
              description="All customer orders"
              icon="▤"
            />

            <SummaryCard
              label="Total Order Amount"
              value={formatCurrency(summary.revenue)}
              description="Combined value of customer orders"
              icon="₱"
            />
          </div>

          {/* ORDER BREAKDOWN */}
          <div className="rounded-xl border border-[#54ACBF]/25 bg-[#A7EBF2]/15 p-4">
            <div className="mb-3">
              <h3 className="text-[12px] font-bold text-[#011C40]">
                Order Breakdown
              </h3>

              <p className="mt-0.5 text-[10px] text-[#26658C]">
                Overview of order progress and payment status.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <BreakdownItem
                label="Pending"
                value={summary.pending}
                valueClass="text-amber-700"
              />

              <BreakdownItem
                label="Processing"
                value={summary.processing}
                valueClass="text-[#26658C]"
              />

              <BreakdownItem
                label="Delivered"
                value={summary.delivered}
                valueClass="text-green-700"
              />

              <BreakdownItem
                label="Cancelled"
                value={summary.cancelled}
                valueClass="text-red-700"
              />

              <BreakdownItem
                label="Paid"
                value={summary.paid}
                valueClass="text-[#023859]"
              />

              <BreakdownItem
                label="Unpaid"
                value={summary.unpaid}
                valueClass="text-amber-700"
              />
            </div>
          </div>
        </section>

        {/* ORDER TABLE */}
        <section className="overflow-hidden rounded-2xl border border-[#54ACBF]/25 bg-white shadow-sm">
          {/* TABLE HEADER */}
          <div className="flex flex-col gap-3 border-b border-[#A7EBF2]/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-base font-bold text-[#011C40]">
                Order Records
              </h2>

              <p className="mt-1 text-[11px] text-[#26658C]">
                Customer details, ordered products, and delivery information.
              </p>
            </div>

            <span className="inline-flex w-fit rounded-full border border-[#54ACBF]/25 bg-[#A7EBF2]/20 px-3 py-1 text-[10px] font-bold text-[#023859]">
              {orders.length} order(s)
            </span>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1700px] text-left text-[11px]">
              <thead className="bg-[#A7EBF2]/20 text-[10px] uppercase tracking-wider text-[#023859]">
                <tr>
                  <th className="px-4 py-3.5">Order Code</th>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Delivery Address</th>
                  <th className="px-4 py-3.5">Items Ordered</th>
                  <th className="px-4 py-3.5">Payment Method</th>
                  <th className="px-4 py-3.5">Payment Status</th>
                  <th className="px-4 py-3.5">Order Date</th>
                  <th className="px-4 py-3.5">Shipping Fee</th>
                  <th className="px-4 py-3.5">Total Amount</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Update Order</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#A7EBF2]/30">
                {loading ? (
                  <tr>
                    <td
                      colSpan="11"
                      className="px-5 py-12 text-center text-[#26658C]"
                    >
                      Loading customer orders...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="px-5 py-12 text-center">
                      <p className="font-semibold text-[#023859]">
                        No customer orders yet.
                      </p>

                      <p className="mt-1 text-[10px] text-[#26658C]">
                        Orders submitted by customers will appear here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  newestOrders.map((order) => {
                    const orderId = order.id;

                    const selectedStatus =
                      selectedStatuses[orderId] ||
                      order.status ||
                      "Pending";

                    const selectedPaymentStatus =
                      selectedStatus === "Delivered"
                        ? "Paid"
                        : selectedPaymentStatuses[orderId] ||
                          order.payment_status ||
                          "Unpaid";

                    const isSaving = Boolean(savingOrders[orderId]);

                    const hasChanges =
                      selectedStatus !== (order.status || "Pending") ||
                      selectedPaymentStatus !==
                        (order.payment_status || "Unpaid");

                    const isFinalStatus = [
                      "Delivered",
                      "Cancelled",
                    ].includes(order.status);

                    return (
                      <tr
                        key={orderId ?? order.order_code}
                        className="transition hover:bg-[#A7EBF2]/10"
                      >
                        {/* ORDER CODE */}
                        <td className="whitespace-nowrap px-4 py-3.5 font-bold text-[#023859]">
                          {order.order_code || "—"}
                        </td>

                        {/* CUSTOMER */}
                        <td className="min-w-[190px] px-4 py-3.5">
                          <p className="font-bold text-[#011C40]">
                            {order.customer_name || "—"}
                          </p>

                          <p className="mt-1 text-[10px] text-[#26658C]">
                            {order.contact_number || "No contact number"}
                          </p>

                          <p className="mt-1 break-all text-[10px] text-[#26658C]/70">
                            {order.email || "No email"}
                          </p>
                        </td>

                        {/* DELIVERY ADDRESS */}
                        <td className="max-w-[230px] px-4 py-3.5 text-[#26658C]">
                          <p className="font-semibold text-[#011C40]">
                            {[order.barangay, order.municipality]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </p>

                          <p className="mt-1 whitespace-pre-line text-[10px]">
                            {order.delivery_address ||
                              "No address provided"}
                          </p>
                        </td>

                        {/* ITEMS ORDERED */}
                        <td className="px-4 py-3.5 align-top">
                          <OrderItems value={order.items_ordered} />
                        </td>

                        {/* PAYMENT METHOD */}
                        <td className="whitespace-nowrap px-4 py-3.5 text-[#26658C]">
                          {order.payment_method || "—"}
                        </td>

                        {/* PAYMENT STATUS */}
                        <td className="min-w-[170px] px-4 py-3.5">
                          <select
                            value={selectedPaymentStatus}
                            onChange={(event) =>
                              handlePaymentStatusChange(
                                orderId,
                                event.target.value
                              )
                            }
                            disabled={
                              isSaving ||
                              selectedStatus === "Delivered"
                            }
                            aria-label={`Payment status for ${
                              order.order_code || "order"
                            }`}
                            className="w-full rounded-lg border border-[#54ACBF]/30 bg-white px-3 py-2 text-[11px] text-[#011C40] outline-none transition focus:border-[#26658C] focus:ring-2 focus:ring-[#54ACBF]/15 disabled:cursor-not-allowed disabled:bg-[#A7EBF2]/10 disabled:opacity-60"
                          >
                            <option value="Unpaid">Unpaid</option>
                            <option value="Paid">Paid</option>
                          </select>

                          <span
                            className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[9px] font-bold ${getPaymentStatusStyle(
                              selectedPaymentStatus
                            )}`}
                          >
                            {selectedPaymentStatus}
                          </span>

                          {(order.payment_method === "GCash" ||
                            order.payment_method === "Bank Transfer") && (
                            <p className="mt-1 text-[9px] leading-4 text-[#26658C]">
                              Verify the transfer before marking Paid.
                            </p>
                          )}
                        </td>

                        {/* ORDER DATE */}
                        <td className="whitespace-nowrap px-4 py-3.5 text-[#26658C]">
                          {formatDate(order.order_date)}
                        </td>

                        {/* SHIPPING FEE */}
                        <td className="whitespace-nowrap px-4 py-3.5 text-[#26658C]">
                          {formatCurrency(order.shipping_fee)}
                        </td>

                        {/* TOTAL AMOUNT */}
                        <td className="whitespace-nowrap px-4 py-3.5 font-bold text-[#011C40]">
                          {formatCurrency(order.total_amount)}
                        </td>

                        {/* ORDER STATUS */}
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold ${getStatusStyle(
                              order.status
                            )}`}
                          >
                            {order.status || "Unknown"}
                          </span>
                        </td>

                        {/* UPDATE ORDER */}
                        <td className="min-w-[175px] px-4 py-3.5">
                          <div className="space-y-2">
                            <select
                              value={selectedStatus}
                              onChange={(event) =>
                                handleStatusChange(
                                  orderId,
                                  event.target.value
                                )
                              }
                              disabled={isSaving || isFinalStatus}
                              aria-label={`Order status for ${
                                order.order_code || "order"
                              }`}
                              className="w-full rounded-lg border border-[#54ACBF]/30 bg-white px-3 py-2 text-[11px] text-[#011C40] outline-none transition focus:border-[#26658C] focus:ring-2 focus:ring-[#54ACBF]/15 disabled:cursor-not-allowed disabled:bg-[#A7EBF2]/10 disabled:opacity-60"
                            >
                              {ORDER_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => saveOrderChanges(order)}
                              disabled={
                                isSaving ||
                                !hasChanges ||
                                (isFinalStatus &&
                                  selectedStatus !== order.status)
                              }
                              className="w-full rounded-lg bg-[#023859] px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-[#011C40] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                            >
                              {isSaving
                                ? "Saving..."
                                : hasChanges
                                  ? "Save Changes"
                                  : "No Changes"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* TABLE FOOTER */}
          <div className="border-t border-[#A7EBF2]/40 bg-[#A7EBF2]/10 px-4 py-3 text-[10px] text-[#26658C]">
            Showing {orders.length} customer order(s)
          </div>
        </section>
      </div>
    </main>
  );
}
