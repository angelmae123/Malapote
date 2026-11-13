
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../providers";
import { apiRequest } from "../../../lib/api";
import { toast } from "react-toastify";
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

    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.7Z" />
        </svg>
      );

    case "support":
      return (
        <svg {...common}>
          <path d="M4 13v-2a8 8 0 0 1 16 0v2" />
          <path d="M4 13h3v6H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 1-2Z" />
          <path d="M20 13h-3v6h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-1-2Z" />
          <path d="M17 19c-.5 1.5-2 2-4 2" />
        </svg>
      );

    case "legal":
      return (
        <svg {...common}>
          <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
          <path d="M14 3v5h5M9 13h6M9 17h6" />
        </svg>
      );

    case "edit":
      return (
        <svg {...common}>
          <path d="m16 4 4 4L8 20H4v-4L16 4Z" />
          <path d="m14 6 4 4" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    default:
      return null;
  }
}

/* BRAND */
function Brand({ mobile = false }) {
  return (
    <Link
      href="/shop/home"
      className="flex shrink-0 items-center gap-2.5"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#023859] text-base font-bold text-white">
        M
      </span>

      <span>
        <span className="block text-[13px] font-bold tracking-wide text-[#011C40]">
          MALAPOTE
        </span>

        <span className="block text-[9px] font-medium uppercase tracking-[0.15em] text-[#26658C]">
          Rice marketplace
        </span>
      </span>
    </Link>
  );
}

/* CUSTOMER NAVIGATION */
function CustomerNavigation({
  activePage = "Profile",
  mobile = false,
}) {
  return (
    <nav
      aria-label={
        mobile ? "Mobile customer navigation" : "Customer navigation"
      }
      className={
        mobile
          ? "fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-[#54ACBF]/30 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_8px_30px_rgba(1,28,64,0.16)] backdrop-blur lg:hidden"
          : "absolute left-1/2 flex -translate-x-1/2 items-center justify-center gap-2"
      }
    >
      <div
        className={
          mobile
            ? "grid grid-cols-4 items-center gap-1"
            : "flex items-center justify-center gap-2"
        }
      >
        {NAVIGATION.map((item) => {
          const active = item.label === activePage;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex items-center justify-center transition-all duration-200 ${
                mobile
                  ? `min-h-[62px] flex-col gap-1 rounded-xl py-2 text-[10px] font-semibold ${
                      active
                        ? "bg-[#023859] text-white shadow-sm"
                        : "text-[#26658C] hover:bg-[#A7EBF2]/25"
                    }`
                  : `h-10 gap-2 rounded-xl px-4 text-[11px] font-semibold ${
                      active
                        ? "bg-[#023859] text-white shadow-sm"
                        : "text-[#26658C] hover:bg-[#A7EBF2]/35 hover:text-[#011C40]"
                    }`
              }`}
            >
              <span
                className={`flex items-center justify-center ${
                  mobile
                    ? `h-7 w-7 rounded-lg ${
                        active
                          ? "bg-[#A7EBF2]/20 text-[#A7EBF2]"
                          : "text-[#26658C]"
                      }`
                    : ""
                }`}
              >
                <NavIcon
                  name={item.icon}
                  className={
                    mobile ? "h-[18px] w-[18px]" : "h-[17px] w-[17px]"
                  }
                />
              </span>

              <span className="whitespace-nowrap leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* PROFILE FIELD */
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
        className="mb-1.5 block text-[11px] font-semibold text-[#26658C]"
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
          className="h-11 w-full rounded-xl border border-[#54ACBF]/30 bg-[#F3F8FA] px-3.5 text-xs text-[#011C40] outline-none transition placeholder:text-[#26658C]/50 focus:border-[#26658C] focus:bg-white focus:ring-2 focus:ring-[#54ACBF]/15"
        />
      ) : (
        <div className="flex min-h-[42px] items-center rounded-xl bg-[#F3F8FA] px-3.5 py-2.5 text-xs text-[#26658C]">
          {value || (
            <span className="text-slate-400">Not provided</span>
          )}
        </div>
      )}
    </div>
  );
}

/* SETTINGS CARD */
function SettingCard({
  icon,
  title,
  description,
  expanded,
  onClick,
  children,
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#54ACBF]/25 bg-white shadow-[0_3px_14px_rgba(1,28,64,0.04)] transition duration-200 hover:border-[#54ACBF]/60">
      <button
        type="button"
        onClick={onClick}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-[#A7EBF2]/[0.06] sm:p-5"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A7EBF2]/35 text-[#023859]">
            <NavIcon name={icon} className="h-[18px] w-[18px]" />
          </div>

          <div className="min-w-0">
            <h4 className="text-sm font-bold text-[#011C40]">
              {title}
            </h4>

            <p className="mt-1 text-xs leading-5 text-[#26658C]">
              {description}
            </p>
          </div>
        </div>

        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3F8FA] text-[#26658C] transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {expanded && (
        <div className="border-t border-[#54ACBF]/20 bg-[#F3F8FA] p-5">
          {children}
        </div>
      )}
    </div>
  );
}

/* INFORMATION SECTION */
function InfoSection({ title, children }) {
  return (
    <section className="rounded-xl border border-[#54ACBF]/20 bg-white p-4">
      <h3 className="text-sm font-bold text-[#011C40]">
        {title}
      </h3>

      <div className="mt-3 text-xs leading-6 text-[#26658C]">
        {children}
      </div>
    </section>
  );
}

/* LOADING SKELETON */
function LoadingSkeleton() {
  return (
    <div className="space-y-5 p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 animate-pulse rounded-full bg-[#A7EBF2]/30" />

        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 animate-pulse rounded bg-[#F3F8FA]" />
          <div className="h-3 w-28 animate-pulse rounded bg-[#F3F8FA]" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-[#F3F8FA]" />
            <div className="h-11 animate-pulse rounded-xl bg-[#F3F8FA]" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* MAIN PAGE */
export default function ShopProfilePage() {
  const { session, ready } = useAuth();

  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [formData, setFormData] = useState(EMPTY_PROFILE);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [activeSection, setActiveSection] = useState("profile");
  const [expandedSetting, setExpandedSetting] = useState("");

  /* LOAD PROFILE */
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);

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
      toast.error(err?.message || "Unable to load your profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;

    if (!session?.accessToken) {
      setLoading(false);
      toast.error("Your session is unavailable. Please log in again.");
      return;
    }

    loadProfile();
  }, [ready, session, loadProfile]);

  /* HANDLE INPUT */
  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  /* CANCEL EDIT */
  function handleCancelEdit() {
    setFormData(profile);
    setEditing(false);
  }

  /* SAVE PROFILE */
  async function handleSaveProfile(event) {
    event.preventDefault();

    if (saving) return;

    try {
      setSaving(true);

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

      toast.success("Your profile has been updated successfully.");
    } catch (err) {
      console.error("Profile update error:", err);
      toast.error(err?.message || "Unable to update your profile.");
    } finally {
      setSaving(false);
    }
  }

  /* TOGGLE SETTINGS */
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
    <main className="min-h-screen bg-[#F3F8FA] pb-28 font-[Arial,Helvetica,sans-serif] text-[#011C40] lg:pb-10">

      {/* DESKTOP HEADER */}
      <header className="sticky top-0 z-30 hidden border-b border-[#54ACBF]/25 bg-white/95 shadow-sm backdrop-blur lg:block">
        <div className="relative mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6 sm:px-8">

          <Brand />

          <CustomerNavigation activePage="Profile" />

          <div className="shrink-0">
            <ShopLogoutButton className="rounded-xl border border-[#54ACBF]/35 px-3.5 py-2 text-[11px] font-semibold text-[#023859] transition hover:bg-[#A7EBF2]/25" />
          </div>

        </div>
      </header>

      {/* MOBILE HEADER */}
      <header className="sticky top-0 z-30 border-b border-[#54ACBF]/25 bg-white/95 shadow-sm backdrop-blur lg:hidden">
        <div className="flex h-[62px] items-center justify-between px-5">

          <Brand mobile />

          <div className="flex items-center gap-2">
            <Link
              href="/shop/cart"
              aria-label="Go to cart"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-[#023859] transition hover:bg-[#A7EBF2]/30"
            >
              <NavIcon name="cart" className="h-4 w-4" />
              Cart
            </Link>

            <ShopLogoutButton className="rounded-lg px-2 py-2 text-[11px] text-[#26658C] hover:bg-[#A7EBF2]/30" />
          </div>

        </div>
      </header>

      {/* PAGE CONTENT */}
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-6 sm:px-8 sm:pt-8">

        {/* PAGE HEADING */}
        <section className="mb-6">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#54ACBF]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#54ACBF]" />
            Account Management
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#011C40] sm:text-[26px]">
            My Profile
          </h1>

          <p className="mt-1.5 max-w-xl text-xs leading-5 text-[#26658C]">
            Manage your personal information and account settings.
          </p>
        </section>

        <div className="grid items-start gap-5 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-6">

          {/* ACCOUNT SIDEBAR */}
          <aside className="h-fit overflow-hidden rounded-2xl border border-[#54ACBF]/25 bg-white shadow-[0_3px_14px_rgba(1,28,64,0.04)]">

            <div className="border-b border-[#54ACBF]/15 bg-gradient-to-br from-white to-[#F3F8FA] p-5">
              <div className="flex items-center gap-3">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white bg-[#A7EBF2]/60 text-base font-bold text-[#023859] shadow-sm">
                  {initials || "C"}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#011C40]">
                    {loading ? "Loading profile..." : displayName}
                  </p>

                  <p className="mt-1 truncate text-[11px] text-[#26658C]">
                    {profile.email || "Customer Account"}
                  </p>
                </div>

              </div>

              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#A7EBF2] bg-[#A7EBF2]/25 px-3 py-1.5 text-[10px] font-semibold text-[#023859]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#54ACBF]" />
                Customer Account
              </div>
            </div>

            <div className="p-3">

              <p className="mb-2 px-3 pt-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#26658C]">
                Account
              </p>

              <button
                type="button"
                onClick={() => setActiveSection("profile")}
                aria-current={
                  activeSection === "profile" ? "page" : undefined
                }
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                  activeSection === "profile"
                    ? "bg-[#A7EBF2]/35 text-[#023859]"
                    : "text-[#26658C] hover:bg-[#F3F8FA] hover:text-[#011C40]"
                }`}
              >
                <NavIcon name="profile" className="h-[18px] w-[18px]" />
                My Profile

                {activeSection === "profile" && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-[#023859]" />
                )}
              </button>

              <p className="mb-2 mt-5 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#26658C]">
                Preferences
              </p>

              <button
                type="button"
                onClick={() => setActiveSection("settings")}
                aria-current={
                  activeSection === "settings" ? "page" : undefined
                }
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                  activeSection === "settings"
                    ? "bg-[#A7EBF2]/35 text-[#023859]"
                    : "text-[#26658C] hover:bg-[#F3F8FA] hover:text-[#011C40]"
                }`}
              >
                <NavIcon name="settings" className="h-[18px] w-[18px]" />
                Settings

                {activeSection === "settings" && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-[#023859]" />
                )}
              </button>

            </div>

            <div className="border-t border-[#54ACBF]/15 bg-[#F8FBFC] p-4">

              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#26658C]">
                Quick Links
              </p>

              <Link
                href="/shop/myorder"
                className="flex items-center gap-2 rounded-lg px-2 py-2 text-[11px] font-semibold text-[#26658C] transition hover:bg-white hover:text-[#023859]"
              >
                <NavIcon name="orders" className="h-4 w-4" />
                View My Orders
              </Link>

              <Link
                href="/shop/home"
                className="flex items-center gap-2 rounded-lg px-2 py-2 text-[11px] font-semibold text-[#26658C] transition hover:bg-white hover:text-[#023859]"
              >
                <NavIcon name="shop" className="h-4 w-4" />
                Browse Products
              </Link>

            </div>
          </aside>

          {/* MAIN CONTENT */}
          <section className="min-w-0">

            {/* PERSONAL INFORMATION */}
            {activeSection === "profile" && (
              <div className="overflow-hidden rounded-2xl border border-[#54ACBF]/25 bg-white shadow-[0_3px_14px_rgba(1,28,64,0.04)]">

                <div className="flex flex-col justify-between gap-3 border-b border-[#54ACBF]/20 p-5 sm:flex-row sm:items-center sm:p-5">

                  <div>
                    <div className="flex items-center gap-2">

                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#A7EBF2]/35 text-[#023859]">
                        <NavIcon name="profile" className="h-4 w-4" />
                      </span>

                      <h2 className="text-sm font-bold text-[#011C40]">
                        Personal Information
                      </h2>

                    </div>

                    <p className="mt-1.5 text-xs text-[#26658C] sm:ml-10">
                      View and update your customer information.
                    </p>
                  </div>

                  {!loading && !editing && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(profile);
                        setEditing(true);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#023859] px-4 py-2.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#011C40]"
                    >
                      <NavIcon name="edit" className="h-4 w-4" />
                      Edit Profile
                    </button>
                  )}

                </div>

                {loading ? (
                  <LoadingSkeleton />
                ) : (
                  <form onSubmit={handleSaveProfile} className="p-5 sm:p-6">

                    {/* PROFILE OVERVIEW */}
                    <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-[#54ACBF]/20 bg-[#F8FBFC] p-4">

                      <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-[#A7EBF2]/60 text-xl font-bold text-[#023859] shadow-sm">
                        {initials || "C"}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-[#011C40]">
                          {displayName}
                        </h3>

                        <p className="mt-1 truncate text-xs text-[#26658C]">
                          {profile.email || "Customer Account"}
                        </p>

                        <p className="mt-1.5 text-[9px] font-bold uppercase tracking-wider text-[#54ACBF]">
                          MALAPOTE CUSTOMER
                        </p>
                      </div>

                    </div>

                    {/* BASIC INFORMATION */}
                    <div className="mb-4">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#023859]">
                        Basic Information
                      </h3>

                      <p className="mt-1 text-[11px] text-[#26658C]">
                        Your personal and account details.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">

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

                      {/* DELIVERY ADDRESS */}
                      <div className="sm:col-span-2">

                        <label
                          htmlFor="delivery_address"
                          className="mb-1.5 block text-[11px] font-semibold text-[#26658C]"
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
                            maxLength={500}
                            placeholder="Enter your complete delivery address"
                            className="w-full resize-none rounded-xl border border-[#54ACBF]/30 bg-[#F3F8FA] px-3.5 py-3 text-xs text-[#011C40] outline-none transition placeholder:text-[#26658C]/50 focus:border-[#26658C] focus:bg-white focus:ring-2 focus:ring-[#54ACBF]/15"
                          />
                        ) : (
                          <div className="min-h-[42px] rounded-xl bg-[#F3F8FA] px-3.5 py-2.5 text-xs leading-6 text-[#26658C]">
                            {profile.delivery_address || (
                              <span className="text-slate-400">
                                No delivery address provided
                              </span>
                            )}
                          </div>
                        )}

                      </div>
                    </div>

                    {/* EDIT ACTIONS */}
                    {editing && (
                      <div className="mt-6 flex flex-col-reverse gap-2 border-t border-[#54ACBF]/20 pt-5 sm:flex-row sm:justify-end">

                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={saving}
                          className="rounded-xl border border-[#54ACBF]/35 bg-white px-5 py-2.5 text-[11px] font-semibold text-[#26658C] transition hover:bg-[#A7EBF2]/20 disabled:opacity-50"
                        >
                          Cancel
                        </button>

                        <button
                          type="submit"
                          disabled={saving}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#023859] px-5 py-2.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#011C40] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {saving ? (
                            <>
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <NavIcon name="check" className="h-4 w-4" />
                              Save Changes
                            </>
                          )}
                        </button>

                      </div>
                    )}

                  </form>
                )}
              </div>
            )}

            {/* SETTINGS */}
            {activeSection === "settings" && (
              <div className="space-y-4">

                <div className="mb-2">
                  <div className="flex items-center gap-2">

                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#A7EBF2]/35 text-[#023859]">
                      <NavIcon name="settings" className="h-4 w-4" />
                    </span>

                    <h2 className="text-sm font-bold text-[#011C40]">
                      Account Settings
                    </h2>

                  </div>

                  <p className="mt-1.5 text-xs text-[#26658C] sm:ml-10">
                    Help, support, and important account information.
                  </p>
                </div>

                {/* HELP AND SUPPORT */}
                <SettingCard
                  icon="support"
                  title="Help & Support"
                  description="Get assistance with your orders, payments, and delivery."
                  expanded={expandedSetting === "support"}
                  onClick={() => toggleSetting("support")}
                >
                  <h3 className="text-sm font-bold text-[#011C40]">
                    How can we help you?
                  </h3>

                  <p className="mt-2 text-xs leading-6 text-[#26658C]">
                    If you have questions or concerns about your AgriStock
                    account, orders, payments, or deliveries, you may contact
                    the AgriStock support team.
                  </p>

                  <div className="mt-4 rounded-xl border border-[#54ACBF]/20 bg-white p-4">

                    <div className="flex items-center gap-2">

                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#A7EBF2]/35 text-[#023859]">
                        <NavIcon name="support" className="h-4 w-4" />
                      </span>

                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#26658C]">
                        Customer Support
                      </p>

                    </div>

                    <p className="mt-3 text-xs leading-6 text-[#26658C]">
                      For assistance, please use the official AgriStock
                      contact information provided by the administrator.
                    </p>

                  </div>
                </SettingCard>

                {/* LEGAL */}
                <SettingCard
                  icon="legal"
                  title="Legal"
                  description="Read the Terms & Conditions and Privacy Policy."
                  expanded={expandedSetting === "legal"}
                  onClick={() => toggleSetting("legal")}
                >
                  <div className="space-y-4">

                    <InfoSection title="Terms & Conditions">
                      <p>
                        By using the MALAPOTE Rice Marketplace, customers
                        agree to provide accurate account and delivery
                        information and use the platform responsibly.
                      </p>

                      <ul className="mt-3 list-disc space-y-2 pl-5">
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
                    </InfoSection>

                    <InfoSection title="Privacy Policy">
                      <p>
                        MALAPOTE collects customer information such as name,
                        email address, phone number, and delivery address
                        to provide its online shopping services.
                      </p>

                      <ul className="mt-3 list-disc space-y-2 pl-5">
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
                    </InfoSection>

                    <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-700">
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

      {/* MOBILE FLOATING BOTTOM NAVIGATION */}
      <CustomerNavigation activePage="Profile" mobile />

    </main>
  );
}
