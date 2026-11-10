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
  if (Array.isArray(response?.orders)) return response.orders;
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
    const totalWeight = quantity * sackSize;

    return {
      type: `${sackSize} kg per sack`,
      quantity: `${quantity} sack(s)`,
      weight: `${totalWeight} kg total`,
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
    Pending: "bg-amber-100 text-amber-700",
    Processing: "bg-blue-100 text-blue-700",
    Delivered: "bg-green-100 text-green-700",
    Cancelled: "bg-red-100 text-red-700",
  };

  return styles[status] || "bg-slate-100 text-slate-700";
}

function OrderItems({ value }) {
  const items = parseOrderItems(value);

  if (!items.length) {
    return (
      <span className="text-slate-400">
        {value && typeof value === "string" && !value.trim().startsWith("[")
          ? value
          : "No item details"}
      </span>
    );
  }

  return (
    <div className="min-w-55 space-y-3">
      {items.map((item, index) => {
        const details = getItemDescription(item);

        return (
          <div
            key={`${item.product_id || item.product_name || "item"}-${index}`}
            className="rounded-lg border border-slate-100 bg-slate-50 p-3"
          >
            <p className="font-semibold text-slate-800">
              {item.product_name || item.name || "Rice Product"}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {details.type}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
                {details.quantity}
              </span>

              {details.weight && (
                <span className="text-xs text-slate-500">
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
  const [success, setSuccess] = useState("");

  const loadOrders = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [response, productResult] = await Promise.all([
        apiRequest("sales/orders", { token }),
        apiRequest("sales/products", { token }).then(
          (productResponse) => ({ data: productResponse, error: "" }),
          (err) => ({ data: null, error: err.message || "Unable to check inventory stock." })
        ),
      ]);
      const orderData = getResponseData(response);

      setOrders(orderData);
      setInventoryWarningError(productResult.error);
      setLowStockProducts(
        getResponseData(productResult.data).filter((product) =>
          getLowStockInfo(product)
        )
      );

      const statusValues = {};

      orderData.forEach((order) => {
        statusValues[order.id] = order.status || "Pending";
      });

      setSelectedStatuses(statusValues);

      const paymentStatusValues = {};

      orderData.forEach((order) => {
        paymentStatusValues[order.id] = order.payment_status || "Unpaid";
      });

      setSelectedPaymentStatuses(paymentStatusValues);
    } catch (err) {
      toast.error(err.message || "Failed to load customer orders.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const summary = useMemo(() => {
    return orders.reduce(
      (result, order) => {
        result.total += 1;

        if (order.status === "Pending") result.pending += 1;
        if (order.status === "Processing") result.processing += 1;
        if (order.status === "Delivered") result.delivered += 1;
        if (order.status === "Cancelled") result.cancelled += 1;
        if (order.payment_status === "Paid") result.paid += 1;
        else result.unpaid += 1;

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

  const handleStatusChange = (orderId, status) => {
    setSelectedStatuses((previous) => ({
      ...previous,
      [orderId]: status,
    }));

    if (status === "Delivered") {
      setSelectedPaymentStatuses((previous) => ({
        ...previous,
        [orderId]: "Paid",
      }));
    }

    toast.success("Action completed successfully.");
    toast.error("Unable to process this request right now. Please try again.");
  };

  const handlePaymentStatusChange = (orderId, status) => {
    setSelectedPaymentStatuses((previous) => ({
      ...previous,
      [orderId]: status,
    }));

    toast.success("Action completed successfully.");
    toast.error("Unable to process this request right now. Please try again.");
  };

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

    if (
      (!newStatus || newStatus === order.status) &&
      newPaymentStatus === (order.payment_status || "Unpaid")
    ) {
      toast.error("Please change the order status or payment status first.");
      return;
    }

    try {
      setSavingOrders((previous) => ({
        ...previous,
        [orderId]: true,
      }));

      toast.error("Unable to process this request right now. Please try again.");
      toast.success("Action completed successfully.");

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
                status: newStatus || item.status,
                payment_status: newPaymentStatus,
              }
            : item
        )
      );

      toast.success(`Order ${order.order_code} updated successfully.`);
    } catch (err) {
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

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-900">
              Sales Management
            </p>

            <h1 className="mt-2 font-serif text-3xl font-semibold text-slate-900">
              Customer Orders
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Monitor customer orders, payment status, and delivery progress.
            </p>
          </div>

          <button
            type="button"
            onClick={loadOrders}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>↻</span>
            {loading ? "Refreshing..." : "Refresh Orders"}
          </button>
        </header>

        {error && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button type="button" onClick={() => toast.error("Unable to process this request right now. Please try again.")} className="font-bold">
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <span>{success}</span>
            <button type="button" onClick={() => toast.success("Action completed successfully.")} className="font-bold">
              ×
            </button>
          </div>
        )}

        {inventoryWarningError ? (
          <div
            role="status"
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            Could not check for low stock: {inventoryWarningError}
          </div>
        ) : lowStockProducts.length > 0 ? (
          <section
            role="alert"
            className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900"
          >
            <h2 className="font-semibold">
              Low stock warning ({lowStockProducts.length})
            </h2>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
              {lowStockProducts.map((product) => {
                const lowStock = getLowStockInfo(product);

                return (
                  <li key={product.id}>
                    {product.product_name || product.inventory_item_name || "Rice"}:{" "}
                    {Number(lowStock.quantity).toLocaleString("en-PH")}{" "}
                    {lowStock.unit} remaining
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total Orders", value: summary.total, color: "text-slate-900" },
            { label: "Pending Orders", value: summary.pending, color: "text-amber-600" },
            { label: "Processing Orders", value: summary.processing, color: "text-blue-700" },
            { label: "Delivered Orders", value: summary.delivered, color: "text-green-700" },
            { label: "Paid Orders", value: summary.paid, color: "text-green-700" },
            { label: "Unpaid Orders", value: summary.unpaid, color: "text-amber-600" },
            { label: "Total Order Amount", value: formatCurrency(summary.revenue), color: "text-blue-900" },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">{card.label}</p>
              <p className={`mt-2 text-2xl font-bold ${card.color}`}>
                {card.value}
              </p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-5 sm:px-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Order Records
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Customer details, ordered products, and delivery information.
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
              {orders.length} order(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1700px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-bold">Order Code</th>
                  <th className="px-5 py-4 font-bold">Customer</th>
                  <th className="px-5 py-4 font-bold">Delivery Address</th>
                  <th className="px-5 py-4 font-bold">Items Ordered</th>
                  <th className="px-5 py-4 font-bold">Payment Method</th>
                  <th className="px-5 py-4 font-bold">Payment Status</th>
                  <th className="px-5 py-4 font-bold">Order Date</th>
                  <th className="px-5 py-4 font-bold">Shipping Fee</th>
                  <th className="px-5 py-4 font-bold">Total Amount</th>
                  <th className="px-5 py-4 font-bold">Status</th>
                  <th className="px-5 py-4 font-bold">Update Order</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="11" className="px-5 py-12 text-center text-slate-500">
                      Loading customer orders...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="px-5 py-12 text-center">
                      <p className="font-semibold text-slate-700">
                        No customer orders yet
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Orders submitted by customers will appear here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  newestOrders.map((order) => {
                    const orderId = order.id;
                    const selectedStatus =
                      selectedStatuses[orderId] || order.status || "Pending";
                    const selectedPaymentStatus =
                      selectedStatus === "Delivered"
                        ? "Paid"
                        : selectedPaymentStatuses[orderId] ||
                          order.payment_status ||
                          "Unpaid";

                    const isSaving = Boolean(savingOrders[orderId]);
                    const hasChanges =
                      selectedStatus !== order.status ||
                      selectedPaymentStatus !== (order.payment_status || "Unpaid");

                    return (
                      <tr
                        key={orderId ?? order.order_code}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-5 py-4 font-semibold text-blue-900">
                          {order.order_code || "—"}
                        </td>

                        <td className="min-w-50 px-5 py-4">
                          <p className="font-semibold text-slate-800">
                            {order.customer_name || "—"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {order.contact_number || "No contact number"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {order.email || "No email"}
                          </p>
                        </td>

                        <td className="max-w-57.5 px-5 py-4 text-slate-600">
                          <p className="font-medium text-slate-800">
                            {[order.barangay, order.municipality]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </p>
                          <p className="mt-1 whitespace-pre-line text-xs text-slate-500">
                            {order.delivery_address || "No address provided"}
                          </p>
                        </td>

                        <td className="px-5 py-4 align-top">
                          <OrderItems value={order.items_ordered} />
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {order.payment_method || "—"}
                        </td>

                        <td className="min-w-42.5 px-5 py-4">
                          <select
                            value={selectedPaymentStatus}
                            onChange={(event) =>
                              handlePaymentStatusChange(orderId, event.target.value)
                            }
                            disabled={isSaving || selectedStatus === "Delivered"}
                            aria-label={`Payment status for ${order.order_code || "order"}`}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
                          >
                            {["Unpaid", "Paid"].map((paymentStatus) => (
                              <option key={paymentStatus} value={paymentStatus}>
                                {paymentStatus}
                              </option>
                            ))}
                          </select>
                          {order.payment_method === "GCash" ||
                          order.payment_method === "Bank Transfer" ? (
                            <p className="mt-1 text-[10px] leading-4 text-slate-500">
                              Verify the transfer before marking Paid.
                            </p>
                          ) : null}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {formatDate(order.order_date)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {formatCurrency(order.shipping_fee)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">
                          {formatCurrency(order.total_amount)}
                        </td>

                        <td className="px-5 py-4">
                          <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(order.status)}`}>
                            {order.status || "Unknown"}
                          </span>
                        </td>

                        <td className="min-w-47.5 px-5 py-4">
                          <div className="space-y-2">
                            <select
                              value={selectedStatus}
                              onChange={(event) =>
                                handleStatusChange(orderId, event.target.value)
                              }
                              disabled={isSaving || order.status === "Delivered" || order.status === "Cancelled"}
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
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
                                (["Delivered", "Cancelled"].includes(order.status) &&
                                  selectedStatus !== order.status)
                              }
                              className="w-full rounded-lg bg-blue-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
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
        </section>
      </div>
    </main>
  );
}
