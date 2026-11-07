
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CART_CHANGE_EVENT,
  getSellableStock,
  readCart,
  writeCart,
} from "../../../lib/shopCart";
import { apiRequest } from "../../../lib/api";
import ShopLogoutButton from "../ShopLogoutButton";

const SHIPPING_RATES_ENDPOINT = "/api/backend/shop/shipping-rates";

// Set NEXT_PUBLIC_BACKEND_URL in .env.local if images are hosted
// on a different backend origin. Leave empty for same-origin images.
const BACKEND_ORIGIN = (
  process.env.NEXT_PUBLIC_BACKEND_URL || ""
).replace(/\/+$/, "");

const navigation = [
  { label: "Shop", href: "/shop/home", icon: "shop" },
  { label: "Cart", href: "/shop/cart", icon: "cart" },
  { label: "My Orders", href: "/shop/myorder", icon: "orders" },
  { label: "Profile", href: "/shop/profile", icon: "profile" },
];

const INITIAL_DELIVERY_DETAILS = {
  full_name: "",
  contact_number: "",
  email: "",
  delivery_address: "",
  municipality: "",
  barangay: "",
  payment_method: "Cash on Delivery",
  order_notes: "",
};

function getImageUrl(path) {
  if (!path) return "";

  if (/^https?:\/\//i.test(path)) return path;

  return `${BACKEND_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
  });
}

function getProductName(item) {
  return item.product_name || item.name || "Rice Product";
}

function getSackSize(item) {
  return Number(item.sack_size_kg ?? 0);
}

function isLooseRice(item) {
  return getSackSize(item) === 0;
}

function getStock(item) {
  return Math.max(
    0,
    Number(
      item.available_quantity ??
        item.available_stock ??
        getSellableStock(item) ??
        0
    )
  );
}

function getItemKey(item) {
  return String(item.id ?? item.product_id);
}

function normalizeCartItem(item) {
  const stock = getStock(item);

  return {
    ...item,
    id: item.id ?? item.product_id,
    product_name: getProductName(item),
    price: Number(item.price || 0),
    quantity: Math.min(
      stock > 0 ? stock : Number.MAX_SAFE_INTEGER,
      Math.max(1, Number(item.quantity || 1))
    ),
    available_quantity: stock,
  };
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getResponseData(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.rates)) return response.rates;
  if (Array.isArray(response?.data?.rates)) {
    return response.data.rates;
  }

  return [];
}

/**
 * Finds the fixed shipping rate for a municipality.
 *
 * Shipping is no longer based on:
 * - Number of sacks
 * - Loose rice kilograms
 * - Sack-equivalent quantity
 * - min_sacks / max_sacks
 *
 * One municipality = one fixed shipping fee.
 */
function findShippingRate(rates, municipality) {
  if (!municipality) return null;

  const normalizedMunicipality = normalizeText(municipality);

  return (
    rates.find((rate) => {
      return (
        normalizeText(rate.municipality) === normalizedMunicipality
      );
    }) || null
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

function RicePlaceholder() {
  return (
    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-green-50">
      <svg viewBox="0 0 100 100" className="h-16 w-16" fill="none">
        <path
          d="m30 20 9-7h22l9 7 7 65H23l7-65Z"
          fill="#fffdf7"
          stroke="#d8d5c9"
          strokeWidth="2"
        />
        <path d="M34 40h32v25H34z" fill="#eaf0ff" />
        <path
          d="M50 58V43"
          stroke="#55a94f"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <ellipse cx="44" cy="48" rx="2.5" ry="4" fill="#ffc947" />
        <ellipse cx="55" cy="46" rx="2.5" ry="4" fill="#ffc947" />
        <ellipse cx="59" cy="54" rx="2.5" ry="4" fill="#ffc947" />
      </svg>
    </div>
  );
}

function ProductImage({ item }) {
  const image = getImageUrl(item.image);

  if (!image) return <RicePlaceholder />;

  return (
    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
      <Image
        src={image}
        alt={getProductName(item)}
        width={96}
        height={96}
        unoptimized
        className="h-full w-full object-cover"
      />
    </div>
  );
}

export default function ShopCartPage() {
  const [cart, setCart] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [notice, setNotice] = useState("");

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  const [shippingRates, setShippingRates] = useState([]);
  const [loadingShippingRates, setLoadingShippingRates] = useState(true);
  const [shippingRatesError, setShippingRatesError] = useState("");

  const [deliveryDetails, setDeliveryDetails] = useState(
    INITIAL_DELIVERY_DETAILS
  );

  const saveCart = useCallback((items) => {
    setCart(items);

    try {
      writeCart(items);
    } catch (error) {
      console.error("Unable to save cart:", error);
      setNotice("Unable to update your cart. Please try again.");
    }
  }, []);

  const loadCart = useCallback(() => {
    try {
      const parsedCart = readCart();

      setCart(
        Array.isArray(parsedCart)
          ? parsedCart.map(normalizeCartItem)
          : []
      );
    } catch (error) {
      console.error("Unable to read cart:", error);
      setCart([]);
    }
  }, []);

  const loadShippingRates = useCallback(async () => {
    setLoadingShippingRates(true);
    setShippingRatesError("");

    try {
      const response = await fetch(SHIPPING_RATES_ENDPOINT, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const result = await response.json().catch(() => []);

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.message || "Unable to load shipping rates."
        );
      }

      setShippingRates(getResponseData(result));
    } catch (error) {
      console.error("Shipping rates error:", error);
      setShippingRates([]);
      setShippingRatesError(
        error.message || "Unable to load shipping rates."
      );
    } finally {
      setLoadingShippingRates(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      if (cancelled) return;

      loadCart();
      setMounted(true);
    });

    function handleStorageChange(event) {
      if (
        event.type === CART_CHANGE_EVENT ||
        event.key === "agristock_cart"
      ) {
        loadCart();
      }
    }

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(CART_CHANGE_EVENT, handleStorageChange);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(CART_CHANGE_EVENT, handleStorageChange);
    };
  }, [loadCart]);

  useEffect(() => {
    loadShippingRates();
  }, [loadShippingRates]);

  const subtotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total + Number(item.price || 0) * Number(item.quantity || 0),
      0
    );
  }, [cart]);

  const totalItems = useMemo(() => {
    return cart.reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    );
  }, [cart]);

  // Fixed shipping fee based only on the selected municipality.
  const selectedShippingRate = useMemo(() => {
    return findShippingRate(
      shippingRates,
      deliveryDetails.municipality
    );
  }, [shippingRates, deliveryDetails.municipality]);

  const shippingFee = selectedShippingRate
    ? Number(selectedShippingRate.shipping_fee || 0)
    : null;

  const grandTotal =
    subtotal + (shippingFee !== null ? shippingFee : 0);

  const updateDeliveryDetails = (field, value) => {
    setDeliveryDetails((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateQuantity = (id, change) => {
    const updatedCart = cart.map((item) => {
      if (getItemKey(item) !== String(id)) return item;

      const stock = getStock(item);
      const nextQuantity = item.quantity + change;

      if (nextQuantity < 1) return item;

      if (stock > 0 && nextQuantity > stock) {
        setNotice(`Only ${stock} units are currently available.`);
        return item;
      }

      setNotice("");

      return {
        ...item,
        quantity: nextQuantity,
      };
    });

    saveCart(updatedCart);
  };

  const removeItem = (id) => {
    const updatedCart = cart.filter(
      (item) => getItemKey(item) !== String(id)
    );

    saveCart(updatedCart);
    setNotice("Product removed from cart.");
  };

  const clearCart = () => {
    if (!window.confirm("Are you sure you want to clear your cart?")) {
      return;
    }

    saveCart([]);
    setNotice("Your cart has been cleared.");
  };

  const openCheckout = () => {
    if (cart.length === 0) {
      setNotice("Your cart is empty.");
      return;
    }

    setNotice("");
    setCheckoutOpen(true);
  };

  const closeCheckout = () => {
    if (placingOrder) return;

    setCheckoutOpen(false);
    setNotice("");
  };

  const placeOrder = async (event) => {
    event.preventDefault();

    if (placingOrder) return;

    if (!cart.length) {
      setNotice("Your cart is empty.");
      setCheckoutOpen(false);
      return;
    }

    const {
      full_name,
      contact_number,
      email,
      delivery_address,
      municipality,
      barangay,
      payment_method,
      order_notes,
    } = deliveryDetails;

    if (
      !full_name.trim() ||
      !contact_number.trim() ||
      !delivery_address.trim() ||
      !municipality.trim() ||
      !barangay.trim() ||
      !payment_method
    ) {
      setNotice("Please complete all required delivery information.");
      return;
    }

    if (loadingShippingRates) {
      setNotice("Please wait while shipping rates are loading.");
      return;
    }

    if (shippingRatesError) {
      setNotice("Unable to load shipping rates. Please try again.");
      return;
    }

    if (!selectedShippingRate) {
      setNotice(
        "No fixed shipping fee is available for your selected municipality."
      );
      return;
    }

    const invalidItem = cart.find(
      (item) =>
        !item.id ||
        Number(item.quantity) < 1 ||
        Number(item.price) < 0
    );

    if (invalidItem) {
      setNotice("One or more cart items have invalid information.");
      return;
    }

    setPlacingOrder(true);
    setNotice("");

    try {
      const payload = {
        customer_name: full_name.trim(),
        contact_number: contact_number.trim(),
        email: email.trim(),
        delivery_address: delivery_address.trim(),
        municipality: municipality.trim(),
        barangay: barangay.trim(),
        payment_method,
        order_notes: order_notes.trim(),

        items_ordered: cart.map((item) => ({
          product_id: item.id,
          quantity: Number(item.quantity),
        })),
      };

      const result = await apiRequest("shop/checkout", {
        method: "POST",
        body: payload,
      });

      if (result.success === false) {
        throw new Error(
          result.message ||
            "Unable to place your order. Please try again."
        );
      }

      saveCart([]);
      setCheckoutOpen(false);
      setDeliveryDetails({ ...INITIAL_DELIVERY_DETAILS });

      const orderCode = result.order_code
        ? ` Order number: ${result.order_code}`
        : "";

      const confirmedShipping = Number(
        result.shipping_fee ?? shippingFee ?? 0
      );

      const confirmedTotal = Number(
        result.total_amount ?? grandTotal
      );

      setNotice(
        `${result.message || "Your order has been placed successfully."}${orderCode} Shipping: ${formatCurrency(confirmedShipping)}. Total: ${formatCurrency(confirmedTotal)}.`
      );
    } catch (error) {
      console.error("Checkout error:", error);

      setNotice(
        error.message ||
          "Unable to connect to the server. Please try again."
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  const getShippingMessage = () => {
    if (loadingShippingRates) {
      return "Loading shipping rates...";
    }

    if (shippingRatesError) {
      return "Shipping rates could not be loaded.";
    }

    if (!deliveryDetails.municipality) {
      return "Enter your municipality at checkout to calculate the fixed shipping fee.";
    }

    if (!selectedShippingRate) {
      return "No fixed shipping fee is available for this municipality.";
    }

    return `Fixed shipping fee for ${selectedShippingRate.municipality}.`;
  };

  if (!mounted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f1f5fd] text-[#17345c]">
        <p className="text-sm font-semibold text-slate-500">
          Loading your cart...
        </p>
      </main>
    );
  }

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
            {navigation.map((item) => {
              const active = item.label === "Cart";

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
              Shopping Cart
            </span>
            <ShopLogoutButton className="px-2 text-xs" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 pb-12 pt-8 sm:px-8 sm:pt-10">
        {/* PAGE TITLE */}
        <section className="mb-7">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#2863ee]">
            Your shopping basket
          </p>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                My Cart
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Review your selected rice products before checkout.
              </p>
            </div>

            <Link
              href="/shop/home"
              className="text-sm font-bold text-[#2458d8] hover:underline"
            >
              ← Continue shopping
            </Link>
          </div>
        </section>

        {notice && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800"
          >
            {notice}
          </div>
        )}

        {/* EMPTY CART */}
        {cart.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-[#cfd9e8] bg-white px-6 py-16 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-[#2863ee]">
              <NavIcon name="cart" className="h-9 w-9" />
            </div>

            <h2 className="text-xl font-extrabold">
              Your cart is empty
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              You haven&apos;t added any rice products yet. Explore our
              available products and add your favorites to your cart.
            </p>

            <Link
              href="/shop/home"
              className="mt-6 inline-flex rounded-xl bg-[#2863ee] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#174fcf]"
            >
              Browse Products
            </Link>
          </section>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
            {/* CART ITEMS */}
            <section className="overflow-hidden rounded-2xl border border-[#e0e8f4] bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8edf5] px-5 py-4">
                <div>
                  <h2 className="font-extrabold">Cart Items</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {totalItems} item{totalItems !== 1 ? "s" : ""} in your cart
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs font-bold text-red-600 hover:underline"
                >
                  Clear Cart
                </button>
              </div>

              <div className="divide-y divide-[#edf1f7]">
                {cart.map((item) => {
                  const stock = getStock(item);
                  const sackSize = getSackSize(item);
                  const itemTotal = item.price * item.quantity;

                  return (
                    <article
                      key={getItemKey(item)}
                      className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
                    >
                      <ProductImage item={item} />

                      <div className="min-w-0 flex-1">
                        {item.category && (
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#2863ee]">
                            {item.category}
                          </p>
                        )}

                        <h3 className="mt-1 font-extrabold text-slate-900">
                          {getProductName(item)}
                        </h3>

                        {item.variety && (
                          <p className="mt-1 text-xs text-slate-500">
                            Variety: {item.variety}
                          </p>
                        )}

                        {sackSize > 0 ? (
                          <p className="mt-1 text-xs text-slate-500">
                            {sackSize} kg Sack
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-slate-500">
                            Loose Rice · Per kilogram
                          </p>
                        )}

                        <p className="mt-2 text-sm font-bold text-[#2458d8]">
                          {formatCurrency(item.price)}
                          <span className="ml-1 text-xs font-medium text-slate-400">
                            {sackSize > 0 ? "per sack" : "per kg"}
                          </span>
                        </p>

                        {stock > 0 && (
                          <p className="mt-1 text-xs text-slate-400">
                            {stock.toLocaleString("en-PH")}{" "}
                            {sackSize > 0 ? "sacks available" : "kg available"}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                        <div className="flex items-center rounded-xl border border-[#dce5f2]">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            disabled={item.quantity <= 1}
                            aria-label={`Decrease quantity of ${getProductName(item)}`}
                            className="flex h-9 w-9 items-center justify-center text-lg font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            −
                          </button>

                          <span className="min-w-9 text-center text-sm font-bold">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 1)}
                            disabled={stock > 0 && item.quantity >= stock}
                            aria-label={`Increase quantity of ${getProductName(item)}`}
                            className="flex h-9 w-9 items-center justify-center text-lg font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="font-extrabold text-slate-900">
                            {formatCurrency(itemTotal)}
                          </p>

                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="mt-1 text-xs font-semibold text-red-500 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            {/* ORDER SUMMARY */}
            <aside className="rounded-2xl border border-[#e0e8f4] bg-white p-5 shadow-sm lg:sticky lg:top-24">
              <h2 className="text-lg font-extrabold">Order Summary</h2>

              <div className="mt-5 space-y-3 border-b border-[#e8edf5] pb-5 text-sm">
                <div className="flex justify-between gap-3 text-slate-500">
                  <span>Total items</span>
                  <span className="font-semibold text-slate-800">
                    {totalItems}
                  </span>
                </div>

                <div className="flex justify-between gap-3 text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between gap-3 text-slate-500">
                  <span>Shipping fee</span>
                  <span className="font-semibold text-slate-800">
                    {shippingFee !== null
                      ? formatCurrency(shippingFee)
                      : "To be calculated"}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-[11px] leading-5 text-slate-500">
                {getShippingMessage()}
              </p>

              <div className="flex items-center justify-between gap-3 py-5">
                <span className="font-bold text-slate-700">
                  Estimated Total
                </span>

                <span className="text-xl font-extrabold text-[#2458d8]">
                  {formatCurrency(grandTotal)}
                </span>
              </div>

              <button
                type="button"
                onClick={openCheckout}
                className="w-full rounded-xl bg-[#2863ee] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#174fcf]"
              >
                Proceed to Checkout
              </button>
            </aside>
          </div>
        )}
      </div>

      {/* CHECKOUT FORM */}
      {checkoutOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3"
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-title"
        >
          <form
            onSubmit={placeOrder}
            className="my-auto w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5"
          >
            {/* CHECKOUT HEADER */}
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#2863ee]">
                  Complete your purchase
                </p>

                <h2
                  id="checkout-title"
                  className="mt-1 text-xl font-extrabold text-[#17345c]"
                >
                  Checkout Details
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Please provide your delivery information.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCheckout}
                disabled={placingOrder}
                aria-label="Close checkout"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-lg text-slate-500 hover:bg-slate-50 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
              {/* DELIVERY INFORMATION */}
              <section>
                <h3 className="mb-3 text-xs font-extrabold text-[#17345c]">
                  Delivery Information
                </h3>

                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="full_name"
                      className="mb-1 block text-[11px] font-bold text-[#17345c]"
                    >
                      Full Name <span className="text-red-500">*</span>
                    </label>

                    <input
                      id="full_name"
                      type="text"
                      required
                      maxLength={150}
                      autoComplete="name"
                      value={deliveryDetails.full_name}
                      onChange={(event) =>
                        updateDeliveryDetails("full_name", event.target.value)
                      }
                      placeholder="Enter your full name"
                      className="w-full rounded-lg border border-[#dfe7f3] bg-[#f7f9fd] px-3 py-2 text-xs outline-none transition focus:border-[#2863ee] focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="contact_number"
                        className="mb-1 block text-[11px] font-bold text-[#17345c]"
                      >
                        Contact Number <span className="text-red-500">*</span>
                      </label>

                      <input
                        id="contact_number"
                        type="tel"
                        required
                        maxLength={20}
                        autoComplete="tel"
                        value={deliveryDetails.contact_number}
                        onChange={(event) =>
                          updateDeliveryDetails(
                            "contact_number",
                            event.target.value
                          )
                        }
                        placeholder="09XX XXX XXXX"
                        className="w-full rounded-lg border border-[#dfe7f3] bg-[#f7f9fd] px-3 py-2 text-xs outline-none transition focus:border-[#2863ee] focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="mb-1 block text-[11px] font-bold text-[#17345c]"
                      >
                        Email Address
                      </label>

                      <input
                        id="email"
                        type="email"
                        maxLength={150}
                        autoComplete="email"
                        value={deliveryDetails.email}
                        onChange={(event) =>
                          updateDeliveryDetails("email", event.target.value)
                        }
                        placeholder="you@example.com"
                        className="w-full rounded-lg border border-[#dfe7f3] bg-[#f7f9fd] px-3 py-2 text-xs outline-none transition focus:border-[#2863ee] focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="delivery_address"
                      className="mb-1 block text-[11px] font-bold text-[#17345c]"
                    >
                      House No. / Street / Landmark{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    <textarea
                      id="delivery_address"
                      required
                      rows={2}
                      maxLength={500}
                      autoComplete="street-address"
                      value={deliveryDetails.delivery_address}
                      onChange={(event) =>
                        updateDeliveryDetails(
                          "delivery_address",
                          event.target.value
                        )
                      }
                      placeholder="House number, street, subdivision, landmark"
                      className="w-full resize-none rounded-lg border border-[#dfe7f3] bg-[#f7f9fd] px-3 py-2 text-xs outline-none transition focus:border-[#2863ee] focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="municipality"
                        className="mb-1 block text-[11px] font-bold text-[#17345c]"
                      >
                        Municipality / City{" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <input
                        id="municipality"
                        type="text"
                        required
                        maxLength={150}
                        value={deliveryDetails.municipality}
                        onChange={(event) =>
                          updateDeliveryDetails(
                            "municipality",
                            event.target.value
                          )
                        }
                        placeholder="Enter municipality"
                        className="w-full rounded-lg border border-[#dfe7f3] bg-[#f7f9fd] px-3 py-2 text-xs outline-none transition focus:border-[#2863ee] focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="barangay"
                        className="mb-1 block text-[11px] font-bold text-[#17345c]"
                      >
                        Barangay <span className="text-red-500">*</span>
                      </label>

                      <input
                        id="barangay"
                        type="text"
                        required
                        maxLength={150}
                        value={deliveryDetails.barangay}
                        onChange={(event) =>
                          updateDeliveryDetails(
                            "barangay",
                            event.target.value
                          )
                        }
                        placeholder="Enter barangay"
                        className="w-full rounded-lg border border-[#dfe7f3] bg-[#f7f9fd] px-3 py-2 text-xs outline-none transition focus:border-[#2863ee] focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  {/* FIXED SHIPPING RATE STATUS */}
                  <div
                    className={`rounded-lg border px-3 py-2.5 ${
                      selectedShippingRate
                        ? "border-green-200 bg-green-50"
                        : "border-amber-200 bg-amber-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-extrabold text-[#17345c]">
                          Shipping Information
                        </p>

                        <p className="mt-1 text-[10px] leading-4 text-slate-600">
                          {getShippingMessage()}
                        </p>
                      </div>

                      {selectedShippingRate && (
                        <span className="shrink-0 text-sm font-extrabold text-green-700">
                          {formatCurrency(shippingFee)}
                        </span>
                      )}
                    </div>

                    {loadingShippingRates && (
                      <p className="mt-2 text-[10px] text-slate-500">
                        Please wait...
                      </p>
                    )}

                    {shippingRatesError && (
                      <button
                        type="button"
                        onClick={loadShippingRates}
                        className="mt-2 text-[10px] font-bold text-[#2458d8] hover:underline"
                      >
                        Retry loading rates
                      </button>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="payment_method"
                      className="mb-1 block text-[11px] font-bold text-[#17345c]"
                    >
                      Payment Method <span className="text-red-500">*</span>
                    </label>

                    <select
                      id="payment_method"
                      required
                      value={deliveryDetails.payment_method}
                      onChange={(event) =>
                        updateDeliveryDetails(
                          "payment_method",
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-[#dfe7f3] bg-[#f7f9fd] px-3 py-2 text-xs outline-none transition focus:border-[#2863ee] focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="Cash on Delivery">
                        Cash on Delivery
                      </option>
                      <option value="GCash">GCash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="order_notes"
                      className="mb-1 block text-[11px] font-bold text-[#17345c]"
                    >
                      Order Notes (Optional)
                    </label>

                    <textarea
                      id="order_notes"
                      rows={2}
                      maxLength={500}
                      value={deliveryDetails.order_notes}
                      onChange={(event) =>
                        updateDeliveryDetails(
                          "order_notes",
                          event.target.value
                        )
                      }
                      placeholder="Delivery instructions or additional notes"
                      className="w-full resize-none rounded-lg border border-[#dfe7f3] bg-[#f7f9fd] px-3 py-2 text-xs outline-none transition focus:border-[#2863ee] focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </section>

              {/* ORDER SUMMARY */}
              <aside className="h-fit rounded-xl border border-[#dfe7f3] bg-[#f7f9fd] p-3">
                <h3 className="mb-3 text-xs font-extrabold text-[#17345c]">
                  Your Order
                </h3>

                <div className="max-h-48 space-y-3 overflow-y-auto">
                  {cart.map((item) => {
                    const sackSize = getSackSize(item);

                    return (
                      <div
                        key={getItemKey(item)}
                        className="flex justify-between gap-2 border-b border-slate-200 pb-2 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-[#17345c]">
                            {getProductName(item)}
                          </p>

                          <p className="mt-0.5 text-[10px] text-slate-500">
                            Quantity: {item.quantity}{" "}
                            {sackSize > 0 ? "sack(s)" : "kg"}
                          </p>

                          {sackSize > 0 && (
                            <p className="text-[10px] text-slate-500">
                              {sackSize} kg sack
                            </p>
                          )}

                          <p className="mt-0.5 text-[10px] text-slate-500">
                            {formatCurrency(item.price)}{" "}
                            {sackSize > 0 ? "per sack" : "per kg"}
                          </p>
                        </div>

                        <span className="shrink-0 text-[11px] font-bold text-[#17345c]">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 space-y-2 border-t border-[#dfe7f3] pt-3 text-[11px]">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Total Items</span>
                    <span className="font-bold text-[#17345c]">
                      {totalItems}
                    </span>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-bold text-[#17345c]">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Fixed Shipping Fee</span>
                    <span className="font-bold text-[#17345c]">
                      {shippingFee !== null
                        ? formatCurrency(shippingFee)
                        : "Unavailable"}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#dfe7f3] pt-3">
                  <span className="text-xs font-extrabold text-[#17345c]">
                    Total
                  </span>

                  <span className="text-lg font-extrabold text-[#2863ee]">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>

                {!selectedShippingRate && (
                  <p className="mt-2 text-[10px] leading-4 text-amber-700">
                    Your final total will be available once a fixed shipping
                    fee is found for your municipality.
                  </p>
                )}
              </aside>
            </div>

            {/* CHECKOUT ACTIONS */}
            <div className="mt-4 flex flex-col-reverse justify-end gap-2 border-t border-slate-100 pt-3 sm:flex-row">
              <button
                type="button"
                onClick={closeCheckout}
                disabled={placingOrder}
                className="rounded-lg border border-[#dfe7f3] px-5 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  placingOrder ||
                  cart.length === 0 ||
                  loadingShippingRates ||
                  !selectedShippingRate
                }
                className="rounded-lg bg-[#2863ee] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#174fcf] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {placingOrder ? "Placing Order..." : "Place Order"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav
        aria-label="Mobile customer navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e0e8f4] bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_18px_rgba(24,56,107,0.07)] backdrop-blur lg:hidden"
      >
        <div className="grid grid-cols-4">
          {navigation.map((item) => {
            const active = item.label === "Cart";

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
