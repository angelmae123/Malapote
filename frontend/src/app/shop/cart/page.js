
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "react-toastify";
import {
  CART_CHANGE_EVENT,
  getSellableStock,
  readCart,
  writeCart,
} from "../../../lib/shopCart";
import { apiRequest } from "../../../lib/api";
import ShopLogoutButton from "../ShopLogoutButton";

const SHIPPING_RATES_ENDPOINT = "/api/backend/shop/shipping-rates";

const BACKEND_ORIGIN = (
  process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "http://127.0.0.1:3000"
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
  return Number(item.sack_size_kg ?? item.sack_weight_kg ?? 0);
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

function findShippingRate(rates, municipality) {
  if (!municipality) return null;

  const normalizedMunicipality = normalizeText(municipality);

  return (
    rates.find(
      (rate) =>
        normalizeText(rate.municipality) === normalizedMunicipality
    ) || null
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

function RiceBagArtwork() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      className="h-14 w-14"
      fill="none"
    >
      <path
        d="m30 20 9-7h22l9 7 7 65H23l7-65Z"
        fill="#fffdf7"
        stroke="#d8d5c9"
        strokeWidth="2"
      />

      <path d="M34 40h32v25H34z" fill="#eaf0ff" />

      <path
        d="M50 58V43"
        stroke="#54ACBF"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <ellipse cx="44" cy="48" rx="2.5" ry="4" fill="#ffc947" />
      <ellipse cx="55" cy="46" rx="2.5" ry="4" fill="#ffc947" />
      <ellipse cx="59" cy="54" rx="2.5" ry="4" fill="#ffc947" />

      <text
        x="50"
        y="76"
        textAnchor="middle"
        fill="#17345c"
        fontSize="5"
        fontWeight="700"
        letterSpacing=".6"
      >
        MALAPOTE
      </text>
    </svg>
  );
}

function RicePlaceholder() {
  return (
    <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#A7EBF2]/40 via-[#F3F8FA] to-[#54ACBF]/20 sm:h-20 sm:w-20">
      <RiceBagArtwork />
    </div>
  );
}

function ProductImage({ item }) {
  const image = getImageUrl(item.image);

  if (!image) return <RicePlaceholder />;

  return (
    <div className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl bg-[#A7EBF2]/20 sm:h-20 sm:w-20">
      <Image
        src={image}
        alt={getProductName(item)}
        fill
        sizes="80px"
        unoptimized
        className="object-cover"
      />
    </div>
  );
}

function FormInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  type = "text",
  maxLength,
  autoComplete,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[11px] font-bold text-[#023859]"
      >
        {label}{" "}
        {required && <span className="text-red-500">*</span>}
      </label>

      <input
        id={id}
        type={type}
        required={required}
        maxLength={maxLength}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-[#54ACBF]/30 bg-[#F3F8FA] px-3 text-xs text-[#011C40] outline-none transition placeholder:text-[#26658C]/50 focus:border-[#26658C] focus:bg-white focus:ring-2 focus:ring-[#54ACBF]/15"
      />
    </div>
  );
}

export default function ShopCartPage() {
  const [cart, setCart] = useState([]);
  const [mounted, setMounted] = useState(false);

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
      toast.error("Unable to update your cart. Please try again.");
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
    loadCart();
    setMounted(true);

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
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(CART_CHANGE_EVENT, handleStorageChange);
    };
  }, [loadCart]);

  useEffect(() => {
    loadShippingRates();
  }, [loadShippingRates]);

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (total, item) =>
          total + Number(item.price || 0) * Number(item.quantity || 0),
        0
      ),
    [cart]
  );

  const totalItems = useMemo(
    () =>
      cart.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0
      ),
    [cart]
  );

  const selectedShippingRate = useMemo(
    () =>
      findShippingRate(
        shippingRates,
        deliveryDetails.municipality
      ),
    [shippingRates, deliveryDetails.municipality]
  );

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
        toast.error(`Only ${stock} units are currently available.`);
        return item;
      }

      return {
        ...item,
        quantity: nextQuantity,
      };
    });

    saveCart(updatedCart);
  };

  const removeItem = (id) => {
    saveCart(
      cart.filter((item) => getItemKey(item) !== String(id))
    );

    toast.success("Product removed from cart.");
  };

  const clearCart = () => {
    if (!window.confirm("Are you sure you want to clear your cart?")) {
      return;
    }

    saveCart([]);
    toast.success("Your cart has been cleared.");
  };

  const openCheckout = () => {
    if (cart.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }

    setCheckoutOpen(true);
  };

  const closeCheckout = () => {
    if (placingOrder) return;

    setCheckoutOpen(false);
  };

  const placeOrder = async (event) => {
    event.preventDefault();

    if (placingOrder) return;

    if (!cart.length) {
      toast.error("Your cart is empty.");
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
      toast.error("Please complete all required delivery information.");
      return;
    }

    if (loadingShippingRates) {
      toast.error("Please wait while shipping rates are loading.");
      return;
    }

    if (shippingRatesError) {
      toast.error("Unable to load shipping rates. Please try again.");
      return;
    }

    if (!selectedShippingRate) {
      toast.error(
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
      toast.error("One or more cart items have invalid information.");
      return;
    }

    setPlacingOrder(true);

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

      toast.success(
        `${result.message || "Your order has been placed successfully."}${orderCode} Shipping: ${formatCurrency(confirmedShipping)}. Total: ${formatCurrency(confirmedTotal)}.`
      );
    } catch (error) {
      console.error("Checkout error:", error);

      toast.error(
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
      <main className="flex min-h-screen items-center justify-center bg-[#F3F8FA] text-[#011C40]">
        <p className="text-xs font-semibold text-[#26658C]">
          Loading your cart...
        </p>
      </main>
    );
  }

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
              const active = item.label === "Cart";

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

                  {item.label === "Cart" && totalItems > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#54ACBF] px-1 text-[10px] font-extrabold text-white">
                      {totalItems > 99 ? "99+" : totalItems}
                    </span>
                  )}
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
              aria-current="page"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-[#023859] transition hover:bg-[#A7EBF2]/30"
            >
              <NavIcon name="cart" className="h-4 w-4" />

              Cart

              {totalItems > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#023859] px-1 text-[10px] font-extrabold text-white">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </Link>

            <ShopLogoutButton className="rounded-lg px-2 py-2 text-xs text-[#26658C] hover:bg-[#A7EBF2]/30" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 pb-12 pt-7 sm:px-8 sm:pt-9">

        {/* PAGE TITLE */}
        <section aria-labelledby="cart-title" className="mb-6">
          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[1.5px] text-[#54ACBF]">
            Your shopping basket
          </p>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1
                id="cart-title"
                className="text-2xl font-serif font-bold tracking-tight text-[#011C40] sm:text-3xl"
              >
                My Cart
              </h1>

              <p className="mt-1.5 text-sm text-[#26658C]">
                Review your selected rice products before checkout.
              </p>
            </div>

            <Link
              href="/shop/home"
              className="rounded-xl border border-[#54ACBF]/30 bg-white px-4 py-2.5 text-xs font-bold text-[#26658C] transition hover:bg-[#A7EBF2]/20 hover:text-[#011C40]"
            >
              ← Continue shopping
            </Link>
          </div>
        </section>

        {/* EMPTY CART */}
        {cart.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-[#54ACBF]/40 bg-white px-6 py-14 text-center shadow-sm sm:py-16">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#A7EBF2]/30 text-[#023859]">
              <NavIcon name="cart" className="h-7 w-7" />
            </div>

            <h2 className="text-lg font-extrabold text-[#011C40]">
              Your cart is empty
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#26658C]">
              You haven&apos;t added any rice products yet. Explore our
              available products and add your favorites to your cart.
            </p>

            <Link
              href="/shop/home"
              className="mt-5 inline-flex rounded-xl bg-[#023859] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#011C40]"
            >
              Browse Products
            </Link>
          </section>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[1fr_320px]">

            {/* CART ITEMS */}
            <section className="overflow-hidden rounded-2xl border border-[#54ACBF]/25 bg-white shadow-[0_3px_14px_rgba(1,28,64,0.04)]">

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#A7EBF2]/60 px-5 py-4 sm:px-6">
                <div>
                  <h2 className="text-base font-extrabold text-[#011C40]">
                    Cart Items
                  </h2>

                  <p className="mt-1 text-xs text-[#26658C]">
                    {totalItems} item{totalItems !== 1 ? "s" : ""} in your cart
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearCart}
                  className="rounded-xl border border-red-100 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50"
                >
                  Clear Cart
                </button>
              </div>

              <div className="divide-y divide-[#A7EBF2]/40">
                {cart.map((item) => {
                  const stock = getStock(item);
                  const sackSize = getSackSize(item);
                  const itemTotal = item.price * item.quantity;

                  return (
                    <article
                      key={getItemKey(item)}
                      className="flex flex-col gap-4 p-5 transition hover:bg-[#A7EBF2]/[0.06] sm:flex-row sm:items-center sm:p-6"
                    >
                      <ProductImage item={item} />

                      <div className="min-w-0 flex-1">

                        {item.category && (
                          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#54ACBF]">
                            {item.category}
                          </p>
                        )}

                        <h3 className="mt-1 text-base font-extrabold tracking-tight text-[#011C40]">
                          {getProductName(item)}
                        </h3>

                        {item.variety && (
                          <p className="mt-1 text-xs text-[#26658C]">
                            Variety: {item.variety}
                          </p>
                        )}

                        {sackSize > 0 ? (
                          <p className="mt-1 text-xs text-[#26658C]">
                            {sackSize} kg Sack
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-[#26658C]">
                            Loose Rice · Per kilogram
                          </p>
                        )}

                        <p className="mt-2 text-sm font-extrabold text-[#023859]">
                          {formatCurrency(item.price)}

                          <span className="ml-1 text-[11px] font-medium text-[#26658C]">
                            {sackSize > 0 ? "per sack" : "per kg"}
                          </span>
                        </p>

                        <p className="mt-1 text-[11px] text-[#26658C]">
                          {stock.toLocaleString("en-PH")}{" "}
                          {sackSize > 0 ? "sacks available" : "kg available"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">

                        {/* QUANTITY */}
                        <div className="flex items-center overflow-hidden rounded-xl border border-[#54ACBF]/35 bg-white">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            disabled={item.quantity <= 1}
                            aria-label={`Decrease quantity of ${getProductName(item)}`}
                            className="flex h-9 w-9 items-center justify-center text-lg font-bold text-[#023859] transition hover:bg-[#A7EBF2]/30 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            −
                          </button>

                          <span className="min-w-9 text-center text-sm font-bold text-[#011C40]">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 1)}
                            disabled={stock > 0 && item.quantity >= stock}
                            aria-label={`Increase quantity of ${getProductName(item)}`}
                            className="flex h-9 w-9 items-center justify-center text-lg font-bold text-[#023859] transition hover:bg-[#A7EBF2]/30 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            +
                          </button>
                        </div>

                        {/* ITEM TOTAL */}
                        <div className="text-right">
                          <p className="text-base font-extrabold text-[#011C40]">
                            {formatCurrency(itemTotal)}
                          </p>

                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="mt-1 text-xs font-semibold text-red-500 transition hover:text-red-700 hover:underline"
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
            <aside className="rounded-2xl border border-[#54ACBF]/25 bg-white p-5 shadow-[0_3px_14px_rgba(1,28,64,0.04)] lg:sticky lg:top-24 lg:p-6">

              <div className="mb-4">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#54ACBF]">
                  Your purchase
                </p>

                <h2 className="text-lg font-extrabold text-[#011C40]">
                  Order Summary
                </h2>
              </div>

              <div className="space-y-3 border-b border-[#A7EBF2]/60 pb-4 text-sm">

                <div className="flex justify-between gap-3 text-[#26658C]">
                  <span>Total items</span>
                  <span className="font-bold text-[#011C40]">
                    {totalItems}
                  </span>
                </div>

                <div className="flex justify-between gap-3 text-[#26658C]">
                  <span>Subtotal</span>
                  <span className="font-bold text-[#011C40]">
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between gap-3 text-[#26658C]">
                  <span>Shipping fee</span>
                  <span className="text-right font-bold text-[#011C40]">
                    {shippingFee !== null
                      ? formatCurrency(shippingFee)
                      : "To be calculated"}
                  </span>
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-[#A7EBF2]/20 px-3 py-3">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-[#26658C]">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 11v5M12 8h.01" />
                    </svg>
                  </span>

                  <p className="text-[11px] leading-5 text-[#26658C]">
                    {getShippingMessage()}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-b border-[#A7EBF2]/60 py-5">
                <span className="text-sm font-bold text-[#023859]">
                  Estimated Total
                </span>

                <span className="text-xl font-extrabold text-[#023859]">
                  {formatCurrency(grandTotal)}
                </span>
              </div>

              <button
                type="button"
                onClick={openCheckout}
                className="mt-5 w-full rounded-xl bg-[#023859] px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#011C40]"
              >
                Proceed to Checkout
              </button>

              <p className="mt-3 text-center text-[10px] leading-5 text-[#26658C]">
                Shipping fee will be calculated based on your delivery municipality.
              </p>
            </aside>
          </div>
        )}
      </div>

      {/* CHECKOUT FORM */}
      {checkoutOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-[#011C40]/60 p-2 backdrop-blur-sm sm:items-center sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCheckout();
            }
          }}
        >
          <form
            onSubmit={placeOrder}
            className="my-auto max-h-[calc(100dvh-16px)] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[#54ACBF]/30 bg-white shadow-2xl sm:max-h-[92dvh]"
          >
            {/* CHECKOUT HEADER */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#A7EBF2]/60 bg-white px-5 py-4 sm:px-7">

              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#54ACBF]">
                  Complete your purchase
                </p>

                <h2
                  id="checkout-title"
                  className="mt-1 text-xl font-extrabold text-[#011C40]"
                >
                  Checkout Details
                </h2>

                <p className="mt-1 text-xs text-[#26658C]">
                  Please provide your delivery information.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCheckout}
                disabled={placingOrder}
                aria-label="Close checkout"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A7EBF2]/30 text-2xl text-[#26658C] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="grid gap-6 p-5 sm:p-7 md:grid-cols-[1.5fr_1fr]">

              {/* DELIVERY INFORMATION */}
              <section>
                <div className="mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#54ACBF]">
                    Step 01
                  </p>

                  <h3 className="mt-1 text-base font-extrabold text-[#011C40]">
                    Delivery Information
                  </h3>

                  <p className="mt-1 text-xs text-[#26658C]">
                    Enter the details where you want your order delivered.
                  </p>
                </div>

                <div className="space-y-4">

                  <FormInput
                    id="full_name"
                    label="Full Name"
                    required
                    maxLength={150}
                    autoComplete="name"
                    value={deliveryDetails.full_name}
                    onChange={(event) =>
                      updateDeliveryDetails("full_name", event.target.value)
                    }
                    placeholder="Enter your full name"
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormInput
                      id="contact_number"
                      label="Contact Number"
                      required
                      type="tel"
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
                    />

                    <FormInput
                      id="email"
                      label="Email Address"
                      type="email"
                      maxLength={150}
                      autoComplete="email"
                      value={deliveryDetails.email}
                      onChange={(event) =>
                        updateDeliveryDetails("email", event.target.value)
                      }
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="delivery_address"
                      className="mb-1.5 block text-[11px] font-bold text-[#023859]"
                    >
                      House No. / Street / Landmark{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    <textarea
                      id="delivery_address"
                      required
                      rows={3}
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
                      className="w-full resize-none rounded-xl border border-[#54ACBF]/30 bg-[#F3F8FA] px-3 py-3 text-xs text-[#011C40] outline-none transition placeholder:text-[#26658C]/50 focus:border-[#26658C] focus:bg-white focus:ring-2 focus:ring-[#54ACBF]/15"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormInput
                      id="municipality"
                      label="Municipality / City"
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
                    />

                    <FormInput
                      id="barangay"
                      label="Barangay"
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
                    />
                  </div>

                  {/* SHIPPING INFORMATION */}
                  <div
                    className={`rounded-xl border p-4 ${
                      selectedShippingRate
                        ? "border-[#54ACBF]/35 bg-[#A7EBF2]/20"
                        : "border-amber-200 bg-amber-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-extrabold text-[#023859]">
                          Shipping Information
                        </p>

                        <p className="mt-1 text-xs leading-5 text-[#26658C]">
                          {getShippingMessage()}
                        </p>
                      </div>

                      {selectedShippingRate && (
                        <span className="shrink-0 text-sm font-extrabold text-[#023859]">
                          {formatCurrency(shippingFee)}
                        </span>
                      )}
                    </div>

                    {loadingShippingRates && (
                      <p className="mt-2 text-[10px] text-[#26658C]">
                        Please wait...
                      </p>
                    )}

                    {shippingRatesError && (
                      <button
                        type="button"
                        onClick={loadShippingRates}
                        className="mt-2 text-xs font-bold text-[#26658C] hover:underline"
                      >
                        Retry loading rates
                      </button>
                    )}
                  </div>

                  {/* PAYMENT METHOD */}
                  <div>
                    <label
                      htmlFor="payment_method"
                      className="mb-1.5 block text-[11px] font-bold text-[#023859]"
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
                      className="h-11 w-full rounded-xl border border-[#54ACBF]/30 bg-[#F3F8FA] px-3 text-xs text-[#011C40] outline-none transition focus:border-[#26658C] focus:bg-white focus:ring-2 focus:ring-[#54ACBF]/15"
                    >
                      <option value="Cash on Delivery">
                        Cash on Delivery
                      </option>

                      <option value="GCash">GCash</option>

                      <option value="Bank Transfer">
                        Bank Transfer
                      </option>
                    </select>
                  </div>

                  {/* ORDER NOTES */}
                  <div>
                    <label
                      htmlFor="order_notes"
                      className="mb-1.5 block text-[11px] font-bold text-[#023859]"
                    >
                      Order Notes (Optional)
                    </label>

                    <textarea
                      id="order_notes"
                      rows={3}
                      maxLength={500}
                      value={deliveryDetails.order_notes}
                      onChange={(event) =>
                        updateDeliveryDetails(
                          "order_notes",
                          event.target.value
                        )
                      }
                      placeholder="Delivery instructions or additional notes"
                      className="w-full resize-none rounded-xl border border-[#54ACBF]/30 bg-[#F3F8FA] px-3 py-3 text-xs text-[#011C40] outline-none transition placeholder:text-[#26658C]/50 focus:border-[#26658C] focus:bg-white focus:ring-2 focus:ring-[#54ACBF]/15"
                    />
                  </div>
                </div>
              </section>

              {/* ORDER SUMMARY */}
              <aside className="h-fit rounded-2xl border border-[#54ACBF]/25 bg-[#F3F8FA] p-4 sm:p-5">

                <div className="mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#54ACBF]">
                    Step 02
                  </p>

                  <h3 className="mt-1 text-base font-extrabold text-[#011C40]">
                    Your Order
                  </h3>
                </div>

                <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
                  {cart.map((item) => {
                    const sackSize = getSackSize(item);

                    return (
                      <div
                        key={getItemKey(item)}
                        className="flex justify-between gap-3 border-b border-[#54ACBF]/20 pb-3 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#011C40]">
                            {getProductName(item)}
                          </p>

                          <p className="mt-1 text-[10px] text-[#26658C]">
                            Quantity: {item.quantity}{" "}
                            {sackSize > 0 ? "sack(s)" : "kg"}
                          </p>

                          {sackSize > 0 && (
                            <p className="text-[10px] text-[#26658C]">
                              {sackSize} kg sack
                            </p>
                          )}

                          <p className="mt-1 text-[10px] text-[#26658C]">
                            {formatCurrency(item.price)}{" "}
                            {sackSize > 0 ? "per sack" : "per kg"}
                          </p>
                        </div>

                        <span className="shrink-0 text-xs font-extrabold text-[#011C40]">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 space-y-3 border-t border-[#54ACBF]/25 pt-4 text-xs">

                  <div className="flex justify-between gap-2">
                    <span className="text-[#26658C]">Total Items</span>

                    <span className="font-bold text-[#011C40]">
                      {totalItems}
                    </span>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="text-[#26658C]">Subtotal</span>

                    <span className="font-bold text-[#011C40]">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="text-[#26658C]">Shipping Fee</span>

                    <span className="font-bold text-[#011C40]">
                      {shippingFee !== null
                        ? formatCurrency(shippingFee)
                        : "Unavailable"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#54ACBF]/25 pt-4">
                  <span className="text-sm font-extrabold text-[#023859]">
                    Total
                  </span>

                  <span className="text-lg font-extrabold text-[#023859]">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>

                {!selectedShippingRate && (
                  <p className="mt-3 rounded-lg bg-amber-50 p-3 text-[10px] leading-5 text-amber-800">
                    Your final total will be available once a fixed shipping
                    fee is found for your municipality.
                  </p>
                )}
              </aside>
            </div>

            {/* CHECKOUT ACTIONS */}
            <div className="sticky bottom-0 flex flex-col-reverse justify-end gap-2 border-t border-[#A7EBF2]/60 bg-white px-5 py-4 sm:flex-row sm:px-7">

              <button
                type="button"
                onClick={closeCheckout}
                disabled={placingOrder}
                className="rounded-xl border border-[#54ACBF]/40 px-6 py-3 text-xs font-bold text-[#26658C] transition hover:bg-[#A7EBF2]/20 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="rounded-xl bg-[#023859] px-7 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#011C40] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {placingOrder ? "Placing Order..." : "Place Order"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MOBILE FLOATING BOTTOM NAVIGATION */}
      <nav
        aria-label="Mobile customer navigation"
        className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-[#54ACBF]/30 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_8px_30px_rgba(1,28,64,0.16)] backdrop-blur lg:hidden"
      >
        <div className="grid grid-cols-4 gap-1">
          {navigation.map((item) => {
            const active = item.label === "Cart";

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

                {item.label === "Cart" && totalItems > 0 && (
                  <span className="absolute right-2 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#54ACBF] px-1 text-[9px] font-extrabold text-white">
                    {totalItems > 99 ? "99+" : totalItems}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
