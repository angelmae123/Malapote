"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../app/providers";
import { apiRequest } from "../../lib/api";

const navigation = [
  {
    section: "Overview",
    links: [{ label: "Dashboard", href: "/dashboard", icon: "⌂" }],
  },
  {
    section: "Farm",
    key: "farm",
    links: [
      {
        label: "Planting & harvest",
        href: "/dashboard/farm/planting-harvesting",
        icon: "⌁",
      },
      { label: "Farm activity", href: "/dashboard/farm/activity", icon: "✳" },
      { label: "Farm Inputs", href: "/dashboard/farm/farminput", icon: "✎" },
      { label: "Farm inventory", href: "/dashboard/farm/inventory", icon: "▤" },

    ],
  },
  {
    section: "Mill",
    key: "mill",
    links: [
      { label: "Production", href: "/dashboard/mill/production", icon: "◉" },
      { label: "Mill inventory", href: "/dashboard/mill/inventory", icon: "▦" },
    ],
  },
  {
    section: "Sales",
    key: "sales",
    links: [
      { label: "Shipping Rate", href: "/dashboard/sales/shipping", icon: "✈" },
      { label: "Products", href: "/dashboard/sales/products", icon: "□" },
      { label: "Orders", href: "/dashboard/sales/orders", icon: "▧" },
      { label: "Reports", href: "/dashboard/sales/reports", icon: "▥" },
    ],
  },
  {
    section: "Office",
    key: "office",
    links: [
      {
        label: "Farmers & workers",
        href: "/dashboard/office/farmers-workers",
        icon: "♧",
      },
      { label: "Payroll", href: "/dashboard/office/payroll", icon: "₱" },
    ],
  },
];

const mobileIcons = {
  Overview: "⌂",
  Farm: "♧",
  Mill: "◉",
  Sales: "▧",
  More: "•••",
};

function RiceMark() {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#638ECB] text-white shadow-sm">
      <svg
        className="h-7 w-7"
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M20 33V14"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M20 22C13 22 9 18 9 12c6 0 11 3 11 10Z"
          fill="currentColor"
        />
        <path
          d="M20 17c0-6 4-10 10-10 0 6-4 10-10 10Z"
          fill="currentColor"
          opacity=".72"
        />
        <path
          d="M12 33h16"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function titleForPath(pathname) {
  const active = navigation
    .flatMap((group) => group.links)
    .find((link) => link.href === pathname);

  if (active) return active.label;
  if (pathname === "/dashboard/profile") return "My Profile";
  if (pathname === "/dashboard/settings") return "Settings";

  return "Dashboard";
}

function getActiveGroup(pathname) {
  if (pathname === "/dashboard") return "Overview";

  return pathname.split("/")[2]
    ? pathname.split("/")[2].charAt(0).toUpperCase() +
        pathname.split("/")[2].slice(1)
    : "Overview";
}

export default function DashboardShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, ready, clearSession } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const profileRef = useRef(null);

  const isSuperAdmin = ["super_admin", "admin"].includes(
    session?.user?.role
  );

  const allowedSections = useMemo(() => {
    if (isSuperAdmin) {
      return ["farm", "mill", "sales", "office"];
    }

    return session?.user?.role === "section_admin"
      ? [session.user.section]
      : [];
  }, [isSuperAdmin, session]);

  const visibleNavigation = navigation.filter(
    (group) => !group.key || allowedSections.includes(group.key)
  );

  const mobileNavigation = visibleNavigation.filter((group) =>
    ["Overview", "Farm", "Mill", "Sales"].includes(group.section)
  );

  const requiredSection = pathname.split("/")[2];

  const isProfilePage = pathname === "/dashboard/profile";
  const isSettingsPage = pathname === "/dashboard/settings";

  const accessDenied =
    requiredSection &&
    !["profile", "settings"].includes(requiredSection) &&
    !allowedSections.includes(requiredSection);

  const activeGroup = getActiveGroup(pathname);

  useEffect(() => {
    if (ready && !session?.user) {
      router.replace("/login");
    }
  }, [ready, router, session]);

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function signOut() {
    const refreshToken = session?.refreshToken;

    clearSession();
    setMenuOpen(false);
    setProfileOpen(false);
    router.replace("/login");

    if (refreshToken) {
      apiRequest("auth/logout", {
        method: "POST",
        body: { refresh_token: refreshToken },
      }).catch((error) => {
        console.error(
          "Could not revoke the session on the server:",
          error
        );
      });
    }
  }

  if (
    !ready ||
    !session?.user ||
    !["super_admin", "admin", "section_admin"].includes(
      session.user.role
    )
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center gap-3 bg-[#F0F3FA] text-xs text-[#395886]">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#D5DEEF] border-t-[#395886]" />
        Preparing your workspace...
      </main>
    );
  }

  const username = session.user.username || "Administrator";
  const userInitial = username.slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen bg-[#F0F3FA] text-[#395886]">
      <style jsx global>{`
        .hide-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .hide-scrollbar::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
      `}</style>

      {/* MOBILE MENU OVERLAY */}
      {menuOpen && (
        <button
          className="fixed inset-0 z-[70] bg-[#18263D]/35 backdrop-blur-[2px] min-[801px]:hidden"
          onClick={() => setMenuOpen(false)}
          aria-label="Close navigation menu"
        />
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] flex-col border-r border-[#D5DEEF] bg-[#F0F3FA] px-5 py-6 min-[801px]:flex">
        {/* LOGO */}
        <Link
          className="flex shrink-0 items-center gap-3 px-2"
          href="/dashboard"
        >
          <RiceMark />

          <span>
            <strong className="block text-[16px] font-extrabold tracking-tight text-[#395886]">
              Malapote
            </strong>
            <small className="mt-1 block text-[9px] font-bold tracking-[1.4px] text-[#638ECB]">
              RICEMILL · AGRISTOCK
            </small>
          </span>
        </Link>

        <div className="my-7 h-px shrink-0 bg-[#D5DEEF]" />

        <p className="mb-4 shrink-0 px-3 text-[9px] font-extrabold tracking-[1.5px] text-[#638ECB]">
          WORKSPACE
        </p>

        {/* DESKTOP NAVIGATION */}
        <nav
          className="hide-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain pb-4"
          aria-label="Main navigation"
        >
          {visibleNavigation.map((group) => (
            <div key={group.section}>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[1px] text-[#638ECB]">
                {group.section}
              </p>

              <div className="space-y-1">
                {group.links.map((link) => {
                  const active = pathname === link.href;

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      prefetch={true}
                      aria-current={active ? "page" : undefined}
                      className={`group flex min-h-[43px] items-center gap-3 rounded-xl px-3 text-[12px] transition-all duration-200 ${
                        active
                          ? "bg-[#395886] font-bold text-white shadow-md shadow-[#395886]/20"
                          : "font-medium text-[#395886] hover:bg-[#D5DEEF] hover:text-[#263F63]"
                      }`}
                    >
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[17px] transition-colors ${
                          active
                            ? "bg-white/15 text-white"
                            : "text-[#638ECB] group-hover:bg-white group-hover:text-[#395886]"
                        }`}
                      >
                        {link.icon}
                      </span>

                      <span>{link.label}</span>

                      {active && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#B1C9EF]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* DESKTOP FOOTER */}
        <div className="shrink-0 border-t border-[#D5DEEF] pt-4">
          <div className="flex items-center gap-3 rounded-xl border border-[#D5DEEF] bg-white p-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#D5DEEF] text-sm font-bold text-[#395886]">
              M
            </span>

            <div className="min-w-0">
              <small className="block text-[9px] font-bold tracking-wide text-[#638ECB]">
                OPERATIONS
              </small>
              <strong className="block truncate text-[11px] text-[#395886]">
                Malapote Ricemill
              </strong>
            </div>

            <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-[#638ECB]" />
          </div>
        </div>
      </aside>

      {/* MOBILE MORE MENU */}
      {menuOpen && (
        <div className="hide-scrollbar fixed bottom-[105px] left-4 right-4 z-[80] max-h-[65vh] overflow-y-auto overscroll-contain rounded-[24px] border border-[#D5DEEF] bg-white p-5 shadow-2xl min-[801px]:hidden">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-[#395886]">
                Navigation
              </h2>
              <p className="mt-1 text-[10px] text-[#638ECB]">
                Malapote AgriStock Workspace
              </p>
            </div>

            <button
              onClick={() => setMenuOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-full bg-[#F0F3FA] text-[#395886] transition hover:bg-[#D5DEEF]"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          {visibleNavigation.map((group) => (
            <div key={group.section} className="mb-5">
              <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[1.3px] text-[#638ECB]">
                {group.section}
              </p>

              <div className="grid grid-cols-2 gap-2">
                {group.links.map((link) => {
                  const active = pathname === link.href;

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex min-h-[48px] items-center gap-2 rounded-xl px-3 text-[11px] font-semibold transition ${
                        active
                          ? "bg-[#395886] text-white"
                          : "bg-[#F0F3FA] text-[#395886] hover:bg-[#D5DEEF]"
                      }`}
                    >
                      <span className="text-base">{link.icon}</span>
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="min-h-screen min-[801px]:ml-[252px]">
        {/* HEADER */}
        <header className="sticky top-0 z-20 flex h-[65px] items-center justify-between gap-3 border-b border-[#D5DEEF] bg-white/95 px-4 backdrop-blur-md min-[801px]:h-[72px] min-[801px]:px-9">
          <div className="flex min-w-0 items-center gap-3">
            {/* MOBILE LOGO */}
            <Link
              href="/dashboard"
              className="flex shrink-0 items-center gap-2 min-[801px]:hidden"
            >
              <RiceMark />
              <strong className="text-[13px] font-extrabold text-[#395886]">
                Malapote
              </strong>
            </Link>

            {/* BREADCRUMB */}
            <div className="hidden items-center gap-2 text-[11px] text-[#638ECB] min-[801px]:flex">
              <span>Workspace</span>
              <span>/</span>
              <strong className="text-[#395886]">
                {titleForPath(pathname)}
              </strong>
            </div>

            <div className="min-w-0 min-[801px]:hidden">
              <p className="truncate text-[11px] font-bold text-[#395886]">
                {titleForPath(pathname)}
              </p>
              <p className="text-[9px] text-[#638ECB]">
                AgriStock Workspace
              </p>
            </div>
          </div>

          {/* PROFILE DROPDOWN */}
          <div className="relative shrink-0" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((previous) => !previous)}
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-full p-1.5 transition hover:bg-[#F0F3FA] focus:outline-none focus:ring-2 focus:ring-[#8AAEE0]"
            >
              <div className="hidden text-right min-[561px]:block">
                <strong className="block max-w-[150px] truncate text-[11px] text-[#395886]">
                  {username}
                </strong>

                <span className="mt-1 block text-[9px] capitalize text-[#638ECB]">
                  {isSuperAdmin
                    ? "Administrator"
                    : `${session.user.section} administrator`}
                </span>
              </div>

              <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#B1C9EF] bg-[#D5DEEF] text-sm font-extrabold text-[#395886]">
                {userInitial}
              </span>

              <span className="hidden text-[10px] text-[#638ECB] min-[561px]:block">
                {profileOpen ? "▲" : "▼"}
              </span>
            </button>

            {profileOpen && (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+10px)] z-[90] w-[225px] overflow-hidden rounded-2xl border border-[#D5DEEF] bg-white p-2 shadow-xl shadow-[#395886]/10"
              >
                <div className="border-b border-[#D5DEEF] px-3 py-3">
                  <p className="truncate text-xs font-extrabold text-[#395886]">
                    {username}
                  </p>
                  <p className="mt-1 text-[10px] capitalize text-[#638ECB]">
                    {isSuperAdmin
                      ? "Administrator"
                      : `${session.user.section} administrator`}
                  </p>
                </div>

                <Link
                  href="/dashboard/profile"
                  role="menuitem"
                  onClick={() => setProfileOpen(false)}
                  className={`mt-2 flex min-h-[42px] items-center gap-3 rounded-xl px-3 text-xs font-semibold transition ${
                    isProfilePage
                      ? "bg-[#D5DEEF] text-[#395886]"
                      : "text-[#395886] hover:bg-[#F0F3FA]"
                  }`}
                >
                  <span className="text-base">♙</span>
                  My Profile
                </Link>

                <Link
                  href="/dashboard/settings"
                  role="menuitem"
                  onClick={() => setProfileOpen(false)}
                  className={`flex min-h-[42px] items-center gap-3 rounded-xl px-3 text-xs font-semibold transition ${
                    isSettingsPage
                      ? "bg-[#D5DEEF] text-[#395886]"
                      : "text-[#395886] hover:bg-[#F0F3FA]"
                  }`}
                >
                  <span className="text-base">⚙</span>
                  Settings
                </Link>

                <div className="my-2 border-t border-[#D5DEEF]" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={signOut}
                  className="flex min-h-[42px] w-full items-center gap-3 rounded-xl px-3 text-left text-xs font-bold text-[#395886] transition hover:bg-[#D5DEEF]"
                >
                  <span className="text-base">↪</span>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="mx-auto min-h-[calc(100vh-65px)] max-w-[1600px] px-4 pb-[115px] pt-6 min-[561px]:px-6 min-[801px]:min-h-[calc(100vh-72px)] min-[801px]:px-9 min-[801px]:pb-12 min-[801px]:pt-9">
          {accessDenied ? (
            <section className="flex min-h-[55vh] flex-col items-center justify-center text-center">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[#D5DEEF] text-3xl text-[#395886]">
                ⌑
              </span>

              <h1 className="mt-5 text-xl font-bold text-[#395886]">
                You do not have access to this section
              </h1>

              <p className="my-3 max-w-sm text-xs leading-6 text-[#638ECB]">
                Your account is limited to the{" "}
                {session.user.section} workspace.
              </p>

              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#395886] px-5 text-xs font-bold text-white transition hover:bg-[#638ECB]"
                href="/dashboard"
              >
                Return to dashboard
              </Link>
            </section>
          ) : (
            children
          )}
        </main>
      </div>

      {/* MOBILE FLOATING BOTTOM NAVIGATION */}
      <nav
        aria-label="Mobile main navigation"
        className="fixed bottom-4 left-3 right-3 z-50 flex h-[68px] items-center justify-around rounded-[23px] border border-white/15 bg-[#395886] px-2 shadow-[0_10px_35px_rgba(57,88,134,0.28)] min-[801px]:hidden"
      >
        {mobileNavigation.map((group) => {
          const active = activeGroup === group.section;
          const firstLink = group.links[0];

          return (
            <Link
              key={group.section}
              href={firstLink.href}
              aria-label={group.section}
              aria-current={active ? "page" : undefined}
              className="group flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1"
            >
              <span
                className={`grid h-10 w-10 place-items-center rounded-full text-xl transition-all duration-300 ${
                  active
                    ? "-translate-y-3 bg-[#B1C9EF] text-[#395886] shadow-lg shadow-black/20"
                    : "text-[#D5DEEF] group-hover:bg-white/10"
                }`}
              >
                {mobileIcons[group.section]}
              </span>

              <span
                className={`text-[8px] font-bold transition-all ${
                  active
                    ? "-mt-3 text-white"
                    : "text-[#D5DEEF]/75"
                }`}
              >
                {group.section === "Overview" ? "Home" : group.section}
              </span>
            </Link>
          );
        })}

        {/* MORE BUTTON */}
        <button
          type="button"
          onClick={() => setMenuOpen((previous) => !previous)}
          aria-label="More navigation options"
          aria-expanded={menuOpen}
          className="group flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1"
        >
          <span
            className={`grid h-10 w-10 place-items-center rounded-full text-xl transition-all duration-300 ${
              menuOpen
                ? "-translate-y-3 bg-[#B1C9EF] text-[#395886] shadow-lg shadow-black/20"
                : "text-[#D5DEEF] group-hover:bg-white/10"
            }`}
          >
            {mobileIcons.More}
          </span>

          <span
            className={`text-[8px] font-bold ${
              menuOpen ? "-mt-3 text-white" : "text-[#D5DEEF]/75"
            }`}
          >
            More
          </span>
        </button>
      </nav>
    </div>
  );
}
