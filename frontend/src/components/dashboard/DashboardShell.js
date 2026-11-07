"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
      // { label: "Seasons", href: "/dashboard/farm/seasons", icon: "◷" },
      { label: "Farm activity", href: "/dashboard/farm/activity", icon: "✳" },
      { label: "Farm inventory", href: "/dashboard/farm/inventory", icon: "▤" },
      {
        label: "Planting & harvest",
        href: "/dashboard/farm/planting-harvesting",
        icon: "⌁",
      },
    ],
  },
  {
    section: "Mill",
    key: "mill",
    links: [
      {
        label: "Production",
        href: "/dashboard/mill/production",
        icon: "◉",
      },
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

function RiceMark() {
  return (
    <span
      className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] border border-white/15 bg-white/10 text-white"
      aria-hidden="true"
    >
      <svg className="h-7.25 w-7.25" viewBox="0 0 40 40" fill="none">
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

  return active?.label || "Dashboard";
}

export default function DashboardShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const { session, ready, clearSession } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);

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
    (group) =>
      !group.key || allowedSections.includes(group.key)
  );

  const requiredSection = pathname.split("/")[2];

  const accessDenied =
    requiredSection && !allowedSections.includes(requiredSection);

  useEffect(() => {
    if (ready && !session?.user) {
      router.replace("/login");
    }
  }, [ready, router, session]);

  function signOut() {
    const refreshToken = session?.refreshToken;

    clearSession();
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
      <main className="flex min-h-screen items-center justify-center gap-3 bg-white text-xs text-slate-500">
        <span className="inline-block h-4.25 w-4.25 animate-spin rounded-full border-2 border-slate-200 border-t-blue-900" />
        Preparing your workspace...
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Mobile overlay */}
      {menuOpen && (
        <button
          className="fixed inset-0 z-70 border-0 bg-slate-950/40 min-[801px]:hidden"
          onClick={() => setMenuOpen(false)}
          aria-label="Close the menu"
        />
      )}

      {/* BLUE SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-80 flex w-67.5 flex-col bg-blue-900 px-4.25 py-6.25 pb-4.5 transition-transform duration-200 min-[801px]:w-63 min-[801px]:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <Link
          className="flex w-fit items-center gap-2.75 px-2 text-white"
          href="/dashboard"
        >
          <RiceMark />

          <span>
            <strong className="block text-[15px] tracking-[.15px]">
              Malapote
            </strong>

            <small className="mt-1 block text-[8px] font-bold tracking-[1.25px] text-blue-200">
              RICEMILL · AGRISTOCK
            </small>
          </span>
        </Link>

        <div className="mx-0.5 mb-5.5 mt-6.25 h-px bg-white/15" />

        <div className="mb-3.5 px-2.5 text-[9px] font-extrabold tracking-[1.35px] text-blue-200">
          WORKSPACE
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 overflow-y-auto pb-4"
          aria-label="Main navigation"
        >
          {visibleNavigation.map((group) => (
            <div className="mb-4.75" key={group.section}>
              <p className="mb-2 px-2.5 text-[9px] font-extrabold tracking-[1.35px] text-blue-200">
                {group.section}
              </p>

              {group.links.map((link) => {
                const active = pathname === link.href;

                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={`my-0.5 flex min-h-9.5 items-center gap-2.75 rounded-md px-2.5 text-[11px] font-semibold transition-colors ${
                      active
                        ? "bg-white font-extrabold text-blue-900"
                        : "text-blue-50 hover:bg-blue-800 hover:text-white"
                    }`}
                    href={link.href}
                    key={link.href}
                    prefetch={true}
                    onClick={() => setMenuOpen(false)}
                  >
                    <span
                      className={`inline-grid h-5 w-5 place-items-center text-sm ${
                        active ? "text-blue-900" : "text-blue-200"
                      }`}
                      aria-hidden="true"
                    >
                      {link.icon}
                    </span>

                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-white/15 pt-3.5">
          <div className="flex items-center gap-2.5 px-2.5 py-[9px] pb-[13px]">
            <span className="h-2 w-2 shrink-0 rounded-full bg-green-300 shadow-[0_0_0_4px_rgb(255_255_255_/_10%)]" />

            <div>
              <small className="mb-1 block text-[8px] font-extrabold tracking-[1px] text-blue-200">
                OPERATIONS
              </small>

              <strong className="block text-[10px] text-white">
                Malapote Ricemill
              </strong>
            </div>
          </div>

          <button
            className="flex min-h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[11px] text-blue-50 transition-colors hover:bg-blue-800 hover:text-white"
            onClick={signOut}
          >
            <span aria-hidden="true">↪</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* WHITE CONTENT AREA */}
      <div className="min-h-screen bg-white min-[801px]:ml-[252px]">

        {/* WHITE HEADER */}
        <header className="sticky top-0 z-20 flex h-[62px] items-center justify-start gap-3.5 border-b border-slate-200 bg-white px-5 min-[801px]:h-[70px] min-[801px]:justify-between min-[801px]:px-[clamp(25px,4vw,55px)]">

          {/* Mobile Menu Button */}
          <button
            className="flex h-8 w-[31px] flex-col items-center justify-center gap-1 rounded-md border border-slate-200 bg-white min-[801px]:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Buksan ang menu"
          >
            <span className="h-[1.5px] w-[13px] rounded bg-slate-600" />
            <span className="h-[1.5px] w-[13px] rounded bg-slate-600" />
            <span className="h-[1.5px] w-[13px] rounded bg-slate-600" />
          </button>

          {/* Page Title */}
          <div className="flex flex-1 items-center gap-1.5 text-[9px] text-slate-400 min-[801px]:flex-none min-[801px]:gap-2.5 min-[801px]:text-[11px]">
            <span>Workspace</span>
            <b className="font-normal text-slate-300">/</b>

            <strong className="text-slate-800">
              {titleForPath(pathname)}
            </strong>
          </div>

          {/* User Information */}
          <div className="flex items-center gap-[7px] min-[801px]:gap-2.5">
            <div className="hidden text-right min-[561px]:block">
              <strong className="block max-w-[115px] overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-slate-800 min-[801px]:max-w-none">
                {session.user.username}
              </strong>

              <span className="mt-1 block text-[9px] capitalize text-slate-500">
                {isSuperAdmin
                  ? "Administrator"
                  : `${session.user.section} administrator`}
              </span>
            </div>

            <span
              className="grid h-[31px] w-[31px] place-items-center rounded-full border border-blue-100 bg-blue-50 font-serif text-base text-blue-900 min-[801px]:h-[34px] min-[801px]:w-[34px]"
              aria-hidden="true"
            >
              {(session.user.username || "A")
                .slice(0, 1)
                .toUpperCase()}
            </span>
          </div>
        </header>

        {/* MAIN CONTENT - PURE WHITE */}
        <main className="mx-auto min-h-[calc(100vh-62px)] max-w-[1500px] bg-white px-[14px] py-[25px] min-[561px]:px-5 min-[561px]:py-[29px] min-[801px]:min-h-[calc(100vh-70px)] min-[801px]:px-[clamp(25px,4vw,55px)] min-[801px]:pb-[55px] min-[801px]:pt-[37px]">
          {accessDenied ? (
            <section className="flex min-h-[55vh] flex-col items-center justify-center text-center">
              <span className="text-[38px] text-blue-900">⌑</span>

              <h1 className="mt-[15px] font-serif text-[27px] font-normal text-slate-800">
                You do not have access to this section
              </h1>

              <p className="my-2 mb-[18px] text-xs text-slate-500">
                Your account is limited to the{" "}
                {session.user.section} workspace.
              </p>

              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-900 px-[18px] text-[13px] font-bold text-white transition hover:bg-blue-800"
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
    </div>
  );
}
