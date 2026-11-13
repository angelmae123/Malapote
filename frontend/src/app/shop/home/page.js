
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "react-toastify";
import { apiRequest } from "../../../lib/api";
import ShopLogoutButton from "../ShopLogoutButton";
import {
  addProductToCart,
  CART_CHANGE_EVENT,
  getCartItemCount,
  readCart,
  writeCart,
} from "../../../lib/shopCart";

const BACKEND_ORIGIN =
  process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "http://127.0.0.1:3000";

const navigation = [
  { label: "Shop", href: "/shop/home", icon: "shop" },
  { label: "Cart", href: "/shop/cart", icon: "cart" },
  { label: "My Orders", href: "/shop/myorder", icon: "orders" },
  { label: "Profile", href: "/shop/profile", icon: "profile" },
];

function getResponseData(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
}

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

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-PH");
}

function getSackWeight(product) {
  return Number(product?.sack_size_kg ?? product?.sack_weight_kg ?? 0);
}

function isLooseRice(product) {
  return getSackWeight(product) <= 0;
}

function getSackLabel(product) {
  const sackWeight = getSackWeight(product);

  return sackWeight > 0
    ? `${formatNumber(sackWeight)} kg Sack`
    : "Loose Rice (Per kg)";
}

function getPriceLabel(product) {
  return isLooseRice(product) ? "per kg" : "per sack";
}

function getSellableQuantity(product) {
  const stock = Math.max(0, Number(product?.stock_quantity || 0));
  const sackWeight = getSackWeight(product);

  if (sackWeight > 0) {
    return Math.floor(stock / sackWeight);
  }

  return stock;
}

function getStockLabel(product) {
  const stock = Math.max(0, Number(product?.stock_quantity || 0));
  const sackWeight = getSackWeight(product);

  if (sackWeight > 0) {
    const availableSacks = Math.floor(stock / sackWeight);

    return `${formatNumber(availableSacks)} sacks · ${formatNumber(stock)} kg available`;
  }

  return `${formatNumber(stock)} kg available`;
}

function getVarietyName(product) {
  return (
    String(
      product?.variety ||
        product?.rice_variety ||
        product?.product_name ||
        "Other Rice Products"
    ).trim() || "Other Rice Products"
  );
}

function getVarietyKey(product) {
  return getVarietyName(product).toLowerCase();
}

function sortProductSizes(items) {
  return [...items].sort((a, b) => {
    const weightA = getSackWeight(a);
    const weightB = getSackWeight(b);

    if (weightA === 0 && weightB > 0) return 1;
    if (weightB === 0 && weightA > 0) return -1;

    return weightA - weightB;
  });
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

function RiceBagArtwork({ className = "h-36 w-36 drop-shadow-lg" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 160 160" className={className}>
      <path
        d="m49 34 13-9h36l13 9 10 101H39L49 34Z"
        fill="#fffdf7"
        stroke="#d8d5c9"
        strokeWidth="3"
      />

      <path
        d="m49 34 13-9 10 14-13 9-10-14Zm49-9 13 9-10 14-13-9 10-14Z"
        fill="#f2ebd9"
        stroke="#d8d5c9"
        strokeWidth="2"
      />

      <path d="M54 68h52v37H54z" fill="#f4f7ff" />

      <path
        d="M80 96V73"
        stroke="#55a94f"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      <ellipse
        cx="72"
        cy="80"
        rx="3"
        ry="5"
        transform="rotate(-27 72 80)"
        fill="#ffc947"
      />

      <ellipse
        cx="84"
        cy="76"
        rx="3"
        ry="5"
        transform="rotate(24 84 76)"
        fill="#ffc947"
      />

      <ellipse
        cx="91"
        cy="84"
        rx="3"
        ry="5"
        transform="rotate(35 91 84)"
        fill="#ffc947"
      />

      <text
        x="80"
        y="119"
        textAnchor="middle"
        fill="#17345c"
        fontSize="8"
        fontWeight="700"
        letterSpacing="1.2"
      >
        MALAPOTE
      </text>
    </svg>
  );
}

function ProductArtwork({ product, compact = false }) {
  const image = getImageUrl(product?.image);
  const artworkClass = compact
    ? "h-24 w-24 rounded-xl"
    : "h-44 w-full";

  if (image) {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden bg-[#A7EBF2]/15 ${artworkClass}`}
      >
        <Image
          src={image}
          alt={getVarietyName(product)}
          fill
          unoptimized
          sizes="(max-width: 640px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#A7EBF2]/40 via-[#F3F8FA] to-[#54ACBF]/20 ${artworkClass}`}
    >
      {!compact && (
        <>
          <div className="absolute -right-7 -top-9 h-36 w-36 rounded-full bg-white/50" />
          <div className="absolute -bottom-16 -left-8 h-36 w-36 rounded-full bg-white/60" />
        </>
      )}

      <RiceBagArtwork
        className={compact ? "h-20 w-20 drop-shadow-md" : undefined}
      />

      {!compact && product?.category && (
        <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#26658C]">
          {product.category}
        </span>
      )}
    </div>
  );
}

export default function ShopHomePage() {
  const [products, setProducts] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantities, setQuantities] = useState({});

  const selectedProduct =
    selectedGroup?.items.find(
      (product) => String(product.id) === selectedProductId
    ) ||
    selectedGroup?.items[0] ||
    null;

  useEffect(() => {
    if (!selectedGroup) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSelectedGroup(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedGroup]);

  const fetchProducts = useCallback(async () => {
    const response = await apiRequest("shop/products");
    return getResponseData(response);
  }, []);

  const updateProductQuantities = useCallback((catalog) => {
    setQuantities((previous) => {
      const next = { ...previous };

      catalog.forEach((product) => {
        const id = String(product.id);
        const stock = getSellableQuantity(product);
        const current = next[id] === "" ? "" : Number(next[id] ?? 1);

        if (stock <= 0) {
          next[id] = 1;
          return;
        }

        if (current === "") return;

        next[id] = Math.max(1, Math.min(stock, current));
      });

      return next;
    });
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const catalog = await fetchProducts();

      setProducts(catalog);
      updateProductQuantities(catalog);
    } catch (requestError) {
      setError(requestError.message || "Unable to load rice products.");
      toast.error(requestError.message || "Unable to load rice products.");
    } finally {
      setLoading(false);
    }
  }, [fetchProducts, updateProductQuantities]);

  useEffect(() => {
    let cancelled = false;

    fetchProducts()
      .then((catalog) => {
        if (!cancelled) {
          setProducts(catalog);
          setError("");
          updateProductQuantities(catalog);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message || "Unable to load rice products.");
          toast.error(requestError.message || "Unable to load rice products.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchProducts, updateProductQuantities]);

  useEffect(() => {
    function syncCart() {
      try {
        setCartCount(getCartItemCount(readCart()));
      } catch (cartError) {
        console.error("Unable to read shopping cart:", cartError);
        toast.error("Unable to read your saved cart.");
      }
    }

    syncCart();

    window.addEventListener(CART_CHANGE_EVENT, syncCart);
    window.addEventListener("storage", syncCart);

    return () => {
      window.removeEventListener(CART_CHANGE_EVENT, syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  const changeQuantity = (product, change) => {
    const id = String(product.id);
    const stock = getSellableQuantity(product);

    setQuantities((previous) => {
      const current = Number(previous[id] ?? 1);
      const next = current + change;

      if (next < 1 || next > stock) return previous;

      return {
        ...previous,
        [id]: next,
      };
    });
  };

  const openProductOptions = (group) => {
    const firstAvailable =
      group.items.find((product) => getSellableQuantity(product) > 0) ||
      group.items[0];

    setSelectedGroup(group);
    setSelectedProductId(String(firstAvailable.id));
  };

  const handleAddToCart = useCallback(
    (product) => {
      try {
        const rawQuantity = quantities[String(product.id)];

        if (rawQuantity === "" || rawQuantity === undefined) {
          toast.error("Please enter a quantity.");
          return;
        }

        const selectedQuantity = Number(rawQuantity);
        const stock = getSellableQuantity(product);

        if (
          !Number.isInteger(selectedQuantity) ||
          selectedQuantity < 1 ||
          selectedQuantity > stock
        ) {
          toast.error(
            `Please enter a valid quantity. Available stock: ${formatNumber(stock)} ${isLooseRice(product) ? "kg" : "sacks"}.`
          );
          return;
        }

        const currentCart = readCart();

        const updatedCart = addProductToCart(
          product,
          currentCart,
          selectedQuantity
        );

        writeCart(updatedCart);

        const unit = isLooseRice(product) ? "kg" : "sack";

        toast.success(
          `${formatNumber(selectedQuantity)} ${unit}${selectedQuantity > 1 ? "s" : ""} of ${getVarietyName(product)} added to your cart.`
        );

        setQuantities((previous) => ({
          ...previous,
          [String(product.id)]: 1,
        }));
      } catch (cartError) {
        console.error("Unable to add product to shopping cart:", cartError);
        toast.error(cartError.message || "Unable to add product to your cart.");
      }
    },
    [quantities]
  );

  const categories = useMemo(
    () => [
      ...new Set(products.map((product) => product.category).filter(Boolean)),
    ],
    [products]
  );

  const groupedProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const filtered = products.filter((product) => {
      const matchesCategory =
        !activeCategory || product.category === activeCategory;

      const searchableFields = [
        product.product_name,
        product.category,
        product.description,
        product.variety,
        product.rice_variety,
        getSackLabel(product),
      ];

      const matchesSearch =
        !keyword ||
        searchableFields
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));

      return matchesCategory && matchesSearch;
    });

    const groups = new Map();

    filtered.forEach((product) => {
      const key = getVarietyKey(product);

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          variety: getVarietyName(product),
          category: product.category || "",
          imageProduct: product,
          description: product.description || "",
          items: [],
        });
      }

      groups.get(key).items.push(product);
    });

    return Array.from(groups.values()).map((group) => ({
      ...group,
      items: sortProductSizes(group.items),
    }));
  }, [activeCategory, products, search]);

  return (
    <main className="min-h-screen bg-[#F3F8FA] pb-28 text-[#011C40] lg:pb-0">
      {/* DESKTOP HEADER */}
      <header className="sticky top-0 z-30 hidden border-b border-[#54ACBF]/25 bg-white/95 shadow-sm backdrop-blur lg:block">
        <div className="mx-auto grid h-[76px] max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-5 sm:px-8">
          {/* LOGO - LEFT */}
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

          {/* NAVIGATION - PERFECTLY CENTERED */}
          <nav
            aria-label="Customer navigation"
            className="flex items-center justify-self-center gap-2"
          >
            {navigation.map((item) => {
              const active = item.label === "Shop";

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
                  <NavIcon name={item.icon} className="h-[18px] w-[18px]" />

                  {item.label}

                  {item.label === "Cart" && cartCount > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#54ACBF] px-1 text-[10px] font-extrabold text-white">
                      {cartCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* LOGOUT - RIGHT */}
          <div className="shrink-0 justify-self-end">
            <ShopLogoutButton className="rounded-xl border border-[#54ACBF]/35 px-3 py-2 text-[12px] font-semibold text-[#023859] transition hover:bg-[#A7EBF2]/25" />
          </div>
        </div>
      </header>

      {/* MOBILE HEADER */}
      <header className="sticky top-0 z-30 border-b border-[#54ACBF]/25 bg-white/95 shadow-sm backdrop-blur lg:hidden">
        <div className="flex h-[64px] items-center justify-between px-5">
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

          <div className="flex items-center gap-2">
            <Link
              href="/shop/cart"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-[#023859] transition hover:bg-[#A7EBF2]/30"
            >
              <NavIcon name="cart" className="h-4 w-4" />
              Cart

              {cartCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#023859] px-1 text-[10px] font-extrabold text-white">
                  {cartCount}
                </span>
              )}
            </Link>

            <ShopLogoutButton className="rounded-lg px-2 py-2 text-xs text-[#26658C] hover:bg-[#A7EBF2]/30" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 pb-12 pt-7 sm:px-8 sm:pt-9">
        {/* PAGE TITLE */}
        <section aria-labelledby="home-title" className="mb-6">
          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[1.5px] text-[#54ACBF]">
            Customer marketplace
          </p>

          <h1
            id="home-title"
            className="text-2xl font-serif font-bold tracking-tight text-[#011C40] sm:text-3xl"
          >
            Home
          </h1>

          <p className="mt-1.5 text-sm text-[#26658C]">
            Welcome! Find your favorite rice products.
          </p>
        </section>

        {/* HERO */}
        <section className="relative isolate mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-[#011C40] via-[#023859] to-[#26658C] px-7 py-9 text-white shadow-sm sm:min-h-[300px] sm:px-12 sm:py-11">
          <div className="absolute -right-16 -top-28 -z-10 h-80 w-80 rounded-full border-[34px] border-white/[0.06]" />
          <div className="absolute -bottom-36 right-[17%] -z-10 h-72 w-72 rounded-full bg-[#A7EBF2]/10" />

          <div className="relative z-10 max-w-2xl">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em] text-[#A7EBF2] sm:text-xs">
              AgriStock Marketplace
            </p>

            <h2 className="text-[34px] font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
              Good food starts
              <span className="mt-1 block text-[#A7EBF2]">
                with good rice.
              </span>
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-6 text-white/85 sm:text-base">
              Quality rice for everyday meals, family gatherings, and
              everything in between.
            </p>

            <a
              href="#products"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#A7EBF2] px-5 py-3 text-sm font-bold text-[#011C40] shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
            >
              Explore products <span aria-hidden="true">→</span>
            </a>
          </div>

          <div className="absolute right-8 top-1/2 hidden -translate-y-1/2 sm:block lg:right-12">
            <div className="relative flex h-48 w-48 items-center justify-center rounded-full bg-white/10">
              <svg
                aria-hidden="true"
                viewBox="0 0 64 64"
                fill="none"
                className="h-24 w-24"
              >
                <path
                  d="M32 54V13"
                  stroke="#A7EBF2"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d="M31 34c-10 0-15-6-15-13 8 0 14 4 15 13Z"
                  fill="#54ACBF"
                />
                <path
                  d="M33 25c1-8 7-13 15-13 0 7-5 13-15 13Z"
                  fill="#A7EBF2"
                />
                <path
                  d="M32 46c-8 0-12-5-12-11 7 0 11 4 12 11Z"
                  fill="#54ACBF"
                />
                <ellipse
                  cx="22"
                  cy="14"
                  rx="3.5"
                  ry="6"
                  transform="rotate(-24 22 14)"
                  fill="#FFC947"
                />
                <ellipse
                  cx="41"
                  cy="8"
                  rx="3.5"
                  ry="6"
                  transform="rotate(18 41 8)"
                  fill="#FFC947"
                />
                <ellipse
                  cx="48"
                  cy="15"
                  rx="3.5"
                  ry="6"
                  transform="rotate(35 48 15)"
                  fill="#FFC947"
                />
              </svg>

              <div className="absolute -bottom-2 right-0 rounded-xl bg-white px-4 py-3 text-[#011C40] shadow-lg">
                <span className="block text-[10px] text-[#26658C]">
                  Quality grains
                </span>
                <span className="block text-xs font-extrabold">
                  Made for your home
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* BENEFITS */}
        <section
          aria-label="Shopping benefits"
          className="mb-8 grid gap-3 sm:grid-cols-3"
        >
          <div className="flex min-h-[82px] items-center gap-3.5 rounded-xl border border-[#54ACBF]/25 bg-white px-4 py-4 shadow-sm sm:px-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#A7EBF2]/40 text-xl text-[#023859]">
              ✳
            </span>
            <span>
              <span className="block text-xs text-[#26658C]">
                Rice varieties
              </span>
              <span className="block text-base font-extrabold leading-6 tracking-tight text-[#011C40] sm:text-lg">
                {loading ? "Loading..." : `${groupedProducts.length} available`}
              </span>
            </span>
          </div>

          <div className="flex min-h-[82px] items-center gap-3.5 rounded-xl border border-[#54ACBF]/25 bg-white px-4 py-4 shadow-sm sm:px-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#A7EBF2]/40 text-[#023859]">
              <NavIcon name="orders" />
            </span>
            <span>
              <span className="block text-xs text-[#26658C]">
                Easy ordering
              </span>
              <span className="block text-base font-extrabold leading-6 tracking-tight text-[#011C40] sm:text-lg">
                Simple &amp; convenient
              </span>
            </span>
          </div>

          <div className="flex min-h-[82px] items-center gap-3.5 rounded-xl border border-[#54ACBF]/25 bg-white px-4 py-4 shadow-sm sm:px-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#A7EBF2]/40 text-[#023859]">
              <span className="text-xl font-bold">₱</span>
            </span>
            <span>
              <span className="block text-xs text-[#26658C]">
                Budget friendly
              </span>
              <span className="block text-base font-extrabold leading-6 tracking-tight text-[#011C40] sm:text-lg">
                Fair prices every day
              </span>
            </span>
          </div>
        </section>

        {/* PRODUCTS */}
        <section
          id="products"
          aria-labelledby="products-title"
          className="scroll-mt-24"
        >
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#54ACBF]">
                Our selection
              </p>
              <h2
                id="products-title"
                className="text-2xl font-extrabold tracking-tight text-[#011C40] sm:text-[28px]"
              >
                Rice varieties
              </h2>
              <p className="mt-1 text-sm text-[#26658C]">
                Choose a rice variety, then select your preferred size.
              </p>
            </div>

            <form
              role="search"
              onSubmit={(event) => event.preventDefault()}
              className="flex h-11 w-full items-center rounded-xl border border-[#54ACBF]/30 bg-white p-1 sm:max-w-[300px]"
            >
              <label className="sr-only" htmlFor="product-search">
                Search products
              </label>
              <input
                id="product-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search rice variety or size..."
                className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-[#011C40] outline-none placeholder:text-[#26658C]/60"
              />
              <button
                type="submit"
                className="h-full rounded-[10px] bg-[#023859] px-4 text-sm font-bold text-white transition hover:bg-[#011C40]"
              >
                Search
              </button>
            </form>
          </div>

          {/* CATEGORY FILTER */}
          <div
            className="mb-5 flex gap-2 overflow-x-auto pb-1"
            role="group"
            aria-label="Filter by product category"
          >
            {["", ...categories].map((category, index) => (
              <button
                key={category || "all"}
                type="button"
                onClick={() => setActiveCategory(category)}
                aria-pressed={activeCategory === category}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition ${
                  activeCategory === category
                    ? "border-[#023859] bg-[#023859] text-white shadow-sm"
                    : "border-[#54ACBF]/30 bg-white text-[#26658C] hover:border-[#54ACBF] hover:bg-[#A7EBF2]/20 hover:text-[#011C40]"
                }`}
              >
                {index === 0 ? "All products" : category}
              </button>
            ))}
          </div>

          {/* LOADING / ERROR / PRODUCTS */}
          {loading ? (
            <div className="rounded-2xl border border-[#54ACBF]/25 bg-white px-6 py-12 text-center text-sm text-[#26658C]">
              Loading products from the catalog...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
              <p className="font-bold text-red-800">
                Could not load products
              </p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                type="button"
                onClick={loadProducts}
                className="mt-4 rounded-xl bg-[#023859] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#011C40]"
              >
                Try again
              </button>
            </div>
          ) : groupedProducts.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
              {groupedProducts.map((group) => (
                <article
                  key={group.key}
                  className="overflow-hidden rounded-2xl border border-[#54ACBF]/25 bg-white shadow-[0_3px_14px_rgba(1,28,64,0.04)] transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <ProductArtwork product={group.imageProduct} />

                  <div className="p-5">
                    <div className="mb-4">
                      {group.category && (
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#26658C]">
                          {group.category}
                        </p>
                      )}
                      <h3 className="mt-1 text-xl font-extrabold tracking-tight text-[#011C40]">
                        {group.variety}
                      </h3>
                      {group.description && (
                        <p className="mt-1 text-xs leading-5 text-[#26658C]">
                          {group.description}
                        </p>
                      )}
                      <p className="mt-2 text-xs font-medium text-[#26658C]">
                        {group.items.length} available option
                        {group.items.length !== 1 ? "s" : ""}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-[#A7EBF2]/60 pt-4">
                      <div>
                        <p className="text-sm font-extrabold text-[#023859]">
                          From{" "}
                          {formatCurrency(
                            Math.min(
                              ...group.items.map((product) =>
                                Number(product.price || 0)
                              )
                            )
                          )}
                        </p>
                        <p className="text-[10px] text-[#26658C]">
                          {group.items.length} purchase option
                          {group.items.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openProductOptions(group)}
                        className="rounded-xl bg-[#023859] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#011C40]"
                      >
                        Choose options
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#54ACBF]/40 bg-white px-6 py-12 text-center">
              <p className="font-bold text-[#011C40]">
                No rice products found
              </p>
              <p className="mt-1 text-sm text-[#26658C]">
                {products.length
                  ? "Try another search or choose a different category."
                  : "There are no available products in the catalog right now."}
              </p>
            </div>
          )}
        </section>
      </div>

      {/* PRODUCT OPTIONS MODAL */}
      {selectedGroup &&
        selectedProduct &&
        (() => {
          const stock = getSellableQuantity(selectedProduct);
          const quantity = Number(
            quantities[String(selectedProduct.id)] ?? 1
          );
          const looseRice = isLooseRice(selectedProduct);
          const unit = looseRice ? "kg" : "sacks";
          const outOfStock = stock <= 0;

          return (
            <div
              className="fixed inset-0 z-[100] flex items-end justify-center bg-[#011C40]/60 p-0 backdrop-blur-sm sm:items-center sm:p-5"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setSelectedGroup(null);
                }
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="product-options-title"
                className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-[#54ACBF]/30 bg-white text-[#011C40] shadow-2xl sm:rounded-2xl"
              >
                {/* MODAL HEADER */}
                <div className="flex items-center justify-between gap-3 border-b border-[#A7EBF2]/60 px-5 py-4 sm:px-6">
                  <div>
                    <p className="mb-1 text-[9px] font-extrabold uppercase tracking-[1.5px] text-[#54ACBF]">
                      Product selection
                    </p>
                    <h2
                      id="product-options-title"
                      className="text-lg font-bold text-[#011C40]"
                    >
                      {selectedGroup.variety}
                    </h2>
                    <p className="mt-0.5 text-[11px] text-[#26658C]">
                      Choose your preferred rice size and quantity.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedGroup(null)}
                    aria-label="Close product options"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#A7EBF2]/30 text-xl text-[#26658C] transition hover:bg-red-50 hover:text-red-600"
                  >
                    ×
                  </button>
                </div>

                {/* MODAL CONTENT */}
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                  <div className="flex items-center gap-4">
                    <ProductArtwork
                      product={selectedGroup.imageProduct}
                      compact
                    />
                    <div>
                      <h3 className="text-sm font-bold text-[#011C40]">
                        Available purchase options
                      </h3>
                      <p className="mt-1 text-xs text-[#26658C]">
                        Select how you want to purchase this rice variety.
                      </p>
                    </div>
                  </div>

                  <div className="my-5 border-t border-[#A7EBF2]/60" />

                  <fieldset>
                    <legend className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[#023859]">
                      Select rice type
                    </legend>
                    <div className="space-y-2">
                      {selectedGroup.items.map((product) => {
                        const optionStock = getSellableQuantity(product);
                        const selected =
                          String(product.id) === selectedProductId;
                        const optionUnit = isLooseRice(product)
                          ? "kg"
                          : "sacks";

                        return (
                          <label
                            key={product.id}
                            className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-3 py-3 transition ${
                              selected
                                ? "border-[#26658C] bg-[#A7EBF2]/20"
                                : "border-[#54ACBF]/25 bg-white hover:bg-[#A7EBF2]/10"
                            } ${
                              optionStock <= 0
                                ? "cursor-not-allowed opacity-50"
                                : ""
                            }`}
                          >
                            <span className="flex min-w-0 items-center gap-3">
                              <input
                                type="radio"
                                name="rice-type"
                                value={product.id}
                                checked={selected}
                                disabled={optionStock <= 0}
                                onChange={() =>
                                  setSelectedProductId(String(product.id))
                                }
                                className="h-4 w-4 shrink-0 accent-[#023859]"
                              />
                              <span>
                                <span className="block text-sm font-semibold text-[#011C40]">
                                  {getSackLabel(product)}
                                </span>
                                <span className="mt-0.5 block text-[11px] text-[#26658C]">
                                  {optionStock > 0
                                    ? `${formatNumber(optionStock)} ${optionUnit} available`
                                    : "Out of stock"}
                                </span>
                              </span>
                            </span>
                            <span className="shrink-0 text-right">
                              <span className="block text-sm font-bold text-[#023859]">
                                {formatCurrency(product.price)}
                              </span>
                              <span className="text-[10px] text-[#26658C]">
                                {getPriceLabel(product)}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div className="mt-5">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#023859]">
                      Quantity (
                      {looseRice
                        ? "kg"
                        : `${getSackWeight(selectedProduct)} kg sacks`}
                      )
                    </p>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => changeQuantity(selectedProduct, -1)}
                        disabled={quantity <= 1 || outOfStock}
                        aria-label="Decrease quantity"
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#54ACBF]/35 text-xl text-[#023859] transition hover:bg-[#A7EBF2]/30 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        −
                      </button>
                      <span
                        aria-live="polite"
                        className="min-w-6 text-center text-base font-bold text-[#011C40]"
                      >
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => changeQuantity(selectedProduct, 1)}
                        disabled={quantity >= stock || outOfStock}
                        aria-label="Increase quantity"
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#54ACBF]/35 text-xl text-[#023859] transition hover:bg-[#A7EBF2]/30 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        +
                      </button>
                      <span className="ml-auto text-sm font-extrabold text-[#023859]">
                        {formatCurrency(
                          Number(selectedProduct.price || 0) * quantity
                        )}
                      </span>
                    </div>

                    {outOfStock && (
                      <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                        This option is currently out of stock.
                      </p>
                    )}
                  </div>
                </div>

                {/* MODAL FOOTER */}
                <div className="border-t border-[#A7EBF2]/60 bg-white px-5 py-4 sm:px-6">
                  <button
                    type="button"
                    onClick={() => {
                      handleAddToCart(selectedProduct);

                      if (
                        stock > 0 &&
                        Number.isInteger(quantity) &&
                        quantity > 0 &&
                        quantity <= stock
                      ) {
                        setSelectedGroup(null);
                      }
                    }}
                    disabled={
                      outOfStock ||
                      !Number.isInteger(quantity) ||
                      quantity < 1
                    }
                    className="w-full rounded-xl bg-[#023859] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#011C40] disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Add to cart
                  </button>
                </div>
              </section>
            </div>
          );
        })()}

      {/* MOBILE FLOATING BOTTOM NAVIGATION */}
      <nav
        aria-label="Mobile customer navigation"
        className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-[#54ACBF]/30 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_8px_30px_rgba(1,28,64,0.16)] backdrop-blur lg:hidden"
      >
        <div className="grid grid-cols-4 gap-1">
          {navigation.map((item) => {
            const active = item.label === "Shop";

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

                {item.label === "Cart" && cartCount > 0 && (
                  <span className="absolute right-2 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#54ACBF] px-1 text-[9px] font-extrabold text-white">
                    {cartCount}
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
