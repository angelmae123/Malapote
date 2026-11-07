
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../providers";
import { apiRequest } from "../../../lib/api";
import ShopLogoutButton from "../ShopLogoutButton";

const NAVIGATION = [
  { label: "Shop", href: "/shop/home", icon: "shop" },
  { label: "Cart", href: "/shop/cart", icon: "cart" },
  { label: "My Orders", href: "/shop/myorder", icon: "orders" },
  { label: "Profile", href: "/shop/profile", icon: "profile" },
];

const EMPTY_PROFILE = {
  username: "",
  full_name: "",
  email: "",
  phone_number: "",
  delivery_address: "",
};

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

function ProfileField({
  label,
  name,
  value,
  editing,
  onChange,
  placeholder,
  type = "text",
  required = false,
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {editing ? (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          maxLength={
            name === "full_name"
              ? 150
              : name === "phone_number"
                ? 30
                : undefined
          }
          className="w-full rounded-lg border border-[#dce5f2] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#2863ee] focus:ring-2 focus:ring-blue-100"
        />
      ) : (
        <div className="min-h-[46px] rounded-lg bg-[#f8faff] px-4 py-3 text-sm text-slate-700">
          {value || (
            <span className="text-slate-400">Not provided</span>
          )}
        </div>
      )}
    </div>
  );
}

function SettingCard({
  icon,
  title,
  description,
  expanded,
  onClick,
  children,
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#e0e8f4] bg-white shadow-sm">
      <button
        type="button"
        onClick={onClick}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-[#f8faff] sm:p-6"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2863ee]">
            <NavIcon name={icon} className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h4 className="text-sm font-extrabold text-[#17345c]">
              {title}
            </h4>
            <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
              {description}
            </p>
          </div>
        </div>

        <span
          className={`shrink-0 text-lg text-slate-400 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        >
          ↓
        </span>
      </button>

      {expanded && (
        <div className="border-t border-[#e8edf5] bg-[#f8faff] p-5 sm:p-6">
          {children}
        </div>
      )}
    </div>
  );
}

export default function ShopProfilePage() {
  const { session, ready } = useAuth();

  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [formData, setFormData] = useState(EMPTY_PROFILE);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [activeSection, setActiveSection] = useState("profile");
  const [expandedSetting, setExpandedSetting] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiRequest("shop/profile");
      const user = response?.user;

      if (!user) {
        throw new Error(
          "Profile information was not returned by the server."
        );
      }

      const customerProfile = {
        username: user.username || "",
        full_name: user.full_name || "",
        email: user.email || "",
        phone_number: user.phone_number || "",
        delivery_address: user.delivery_address || "",
      };

      setProfile(customerProfile);
      setFormData(customerProfile);
    } catch (err) {
      console.error("Profile loading error:", err);
      setError(err?.message || "Unable to load your profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;

    if (!session?.accessToken) {
      setLoading(false);
      setError("Your session is unavailable. Please log in again.");
      return;
    }

    loadProfile();
  }, [ready, session, loadProfile]);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleCancelEdit() {
    setFormData(profile);
    setEditing(false);
    setError("");
    setMessage("");
  }

  async function handleSaveProfile(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const response = await apiRequest("shop/profile", {
        method: "PUT",
        body: formData,
      });

      const updatedUser = response?.user;

      if (!updatedUser) {
        throw new Error(
          "Updated profile was not returned by the server."
        );
      }

      const updatedProfile = {
        username: updatedUser.username || "",
        full_name: updatedUser.full_name || "",
        email: updatedUser.email || "",
        phone_number: updatedUser.phone_number || "",
        delivery_address: updatedUser.delivery_address || "",
      };

      setProfile(updatedProfile);
      setFormData(updatedProfile);
      setEditing(false);
      setMessage("Your profile has been updated successfully.");
    } catch (err) {
      console.error("Profile update error:", err);
      setError(err?.message || "Unable to update your profile.");
    } finally {
      setSaving(false);
    }
  }

  function toggleSetting(setting) {
    setExpandedSetting((previous) =>
      previous === setting ? "" : setting
    );
  }

  const displayName =
    profile.full_name || profile.username || "Customer";

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

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
              const active = item.label === "Profile";

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
              My Profile
            </span>
            <ShopLogoutButton className="px-2 text-xs" />
          </div>
        </div>
      </header>

      {/* PAGE CONTENT */}
      <div className="mx-auto max-w-7xl px-5 pb-12 pt-8 sm:px-8 sm:pt-10">

        <section className="mb-7">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#2863ee]">
            Account Management
          </p>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            My Profile
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage your personal information and account settings.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[245px_1fr]">

          {/* SIDEBAR */}
          <aside className="h-fit rounded-xl border border-[#e0e8f4] bg-white p-4 shadow-sm">

            <div className="mb-5 flex items-center gap-3 border-b border-[#edf1f7] px-2 pb-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-extrabold text-[#2458d8]">
                {initials || "C"}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-[#17345c]">
                  {loading ? "Loading profile..." : displayName}
                </p>

                <p className="truncate text-xs text-slate-400">
                  {profile.email || "Customer Account"}
                </p>
              </div>
            </div>

            <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Account
            </p>

            <button
              type="button"
              onClick={() => {
                setActiveSection("profile");
                setError("");
                setMessage("");
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-bold transition ${
                activeSection === "profile"
                  ? "bg-blue-50 text-[#2458d8]"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <NavIcon name="profile" />
              My Profile
            </button>

            <p className="mb-2 mt-6 px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Preferences
            </p>

            <button
              type="button"
              onClick={() => {
                setActiveSection("settings");
                setError("");
                setMessage("");
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-bold transition ${
                activeSection === "settings"
                  ? "bg-blue-50 text-[#2458d8]"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3h-.2a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 3Z" />
              </svg>
              Settings
            </button>
          </aside>

          {/* MAIN PANEL */}
          <section className="min-w-0">

            {error && (
              <div
                role="alert"
                className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <span>{error}</span>

                <button
                  type="button"
                  onClick={loadProfile}
                  className="shrink-0 font-bold underline"
                >
                  Retry
                </button>
              </div>
            )}

            {message && (
              <div
                role="status"
                className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700"
              >
                ✓ {message}
              </div>
            )}

            {/* PROFILE */}
            {activeSection === "profile" && (
              <div className="overflow-hidden rounded-xl border border-[#e0e8f4] bg-white shadow-sm">

                <div className="flex flex-col justify-between gap-3 border-b border-[#e8edf5] p-5 sm:flex-row sm:items-center sm:p-6">
                  <div>
                    <h2 className="text-lg font-extrabold text-[#17345c]">
                      Personal Information
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      View and update your customer information.
                    </p>
                  </div>

                  {!loading && !editing && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(profile);
                        setEditing(true);
                        setError("");
                        setMessage("");
                      }}
                      className="rounded-lg bg-[#2863ee] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#174fcf]"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>

                {loading ? (
                  <div className="space-y-5 p-6">
                    <div className="h-16 w-16 animate-pulse rounded-full bg-slate-100" />
                    <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
                    <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
                    <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
                  </div>
                ) : (
                  <form onSubmit={handleSaveProfile} className="p-5 sm:p-6">

                    <div className="mb-7 flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-extrabold text-[#2458d8]">
                        {initials || "C"}
                      </div>

                      <div>
                        <h3 className="font-extrabold text-[#17345c]">
                          {displayName}
                        </h3>

                        <p className="mt-1 text-xs text-slate-400">
                          Customer Account
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">

                      <ProfileField
                        label="Full Name"
                        name="full_name"
                        value={formData.full_name}
                        editing={editing}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                      />

                      <ProfileField
                        label="Username"
                        name="username"
                        value={formData.username}
                        editing={editing}
                        onChange={handleChange}
                        placeholder="Enter your username"
                        required
                      />

                      <ProfileField
                        label="Email Address"
                        name="email"
                        type="email"
                        value={formData.email}
                        editing={editing}
                        onChange={handleChange}
                        placeholder="Enter your email address"
                        required
                      />

                      <ProfileField
                        label="Phone Number"
                        name="phone_number"
                        value={formData.phone_number}
                        editing={editing}
                        onChange={handleChange}
                        placeholder="Enter your phone number"
                      />

                      <div className="sm:col-span-2">
                        <label
                          htmlFor="delivery_address"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Delivery Address
                        </label>

                        {editing ? (
                          <textarea
                            id="delivery_address"
                            name="delivery_address"
                            value={formData.delivery_address}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Enter your complete delivery address"
                            className="w-full resize-none rounded-lg border border-[#dce5f2] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#2863ee] focus:ring-2 focus:ring-blue-100"
                          />
                        ) : (
                          <div className="min-h-[46px] rounded-lg bg-[#f8faff] px-4 py-3 text-sm text-slate-700">
                            {profile.delivery_address || (
                              <span className="text-slate-400">
                                No delivery address provided
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {editing && (
                      <div className="mt-7 flex flex-col-reverse gap-3 border-t border-[#e8edf5] pt-5 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={saving}
                          className="rounded-lg border border-[#dce5f2] bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          Cancel
                        </button>

                        <button
                          type="submit"
                          disabled={saving}
                          className="rounded-lg bg-[#2863ee] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#174fcf] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    )}
                  </form>
                )}
              </div>
            )}

            {/* SETTINGS */}
            {activeSection === "settings" && (
              <div className="space-y-5">

                <div className="mb-2">
                  <h2 className="text-lg font-extrabold text-[#17345c]">
                    Settings
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Help, support, and important account information.
                  </p>
                </div>

                {/* HELP & SUPPORT */}
                <SettingCard
                  icon="profile"
                  title="Help & Support"
                  description="Get assistance with your orders, payments, and delivery."
                  expanded={expandedSetting === "support"}
                  onClick={() => toggleSetting("support")}
                >
                  <h3 className="text-sm font-extrabold text-[#17345c]">
                    How can we help you?
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    If you have questions or concerns about your AgriStock
                    account, orders, payments, or deliveries, you may contact
                    the AgriStock support team.
                  </p>

                  <div className="mt-4 rounded-lg border border-[#e0e8f4] bg-white p-4">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Customer Support
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      For assistance, please use the official AgriStock
                      contact information provided by the administrator.
                    </p>
                  </div>
                </SettingCard>

                {/* LEGAL */}
                <SettingCard
                  icon="orders"
                  title="Legal"
                  description="Read the Terms & Conditions and Privacy Policy."
                  expanded={expandedSetting === "legal"}
                  onClick={() => toggleSetting("legal")}
                >
                  <div className="space-y-5">

                    <section className="rounded-lg border border-[#e0e8f4] bg-white p-4 sm:p-5">
                      <h3 className="text-sm font-extrabold text-[#17345c]">
                        Terms & Conditions
                      </h3>

                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        By using the MALAPOTE Rice Marketplace, customers
                        agree to provide accurate account and delivery
                        information and use the platform responsibly.
                      </p>

                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
                        <li>
                          Customers are responsible for maintaining accurate
                          account information.
                        </li>
                        <li>
                          Orders are subject to product availability and
                          confirmation.
                        </li>
                        <li>
                          Customers should review their order details before
                          submitting a purchase.
                        </li>
                        <li>
                          Order cancellations are subject to the applicable
                          order status and shop policies.
                        </li>
                      </ul>
                    </section>

                    <section className="rounded-lg border border-[#e0e8f4] bg-white p-4 sm:p-5">
                      <h3 className="text-sm font-extrabold text-[#17345c]">
                        Privacy Policy
                      </h3>

                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        MALAPOTE collects customer information such as name,
                        email address, phone number, and delivery address
                        to provide its online shopping services.
                      </p>

                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
                        <li>
                          Customer information is used to manage accounts
                          and process orders.
                        </li>
                        <li>
                          Delivery information is used to coordinate order
                          fulfillment.
                        </li>
                        <li>
                          Account information should only be accessed by
                          authorized personnel.
                        </li>
                        <li>
                          Customers should keep their login credentials
                          confidential.
                        </li>
                      </ul>
                    </section>

                    <p className="text-xs leading-5 text-slate-400">
                      These are initial policy descriptions and should be
                      reviewed and approved by the administrator before
                      deployment.
                    </p>

                  </div>
                </SettingCard>

              </div>
            )}

          </section>
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav
        aria-label="Mobile customer navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e0e8f4] bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_18px_rgba(24,56,107,0.07)] backdrop-blur lg:hidden"
      >
        <div className="grid grid-cols-4">

          {NAVIGATION.map((item) => {
            const active = item.label === "Profile";

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
