import Link from "next/link";

export default function AdminLandingPage() {
  return (
    <main className="relative isolate flex min-h-screen items-center overflow-hidden bg-[#F4F8FC] px-4 py-8 text-[#011C40] sm:px-6 sm:py-12 lg:px-10">
      {/* Background decorations */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-28 -top-28 -z-10 h-64 w-64 rounded-full bg-[#A7EBF2]/40 blur-2xl sm:h-96 sm:w-96"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-28 -z-10 h-72 w-72 rounded-full bg-[#54ACBF]/15 blur-2xl sm:h-[28rem] sm:w-[28rem]"
      />

      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <header className="mb-12 flex items-center justify-between gap-4 sm:mb-16">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#023859] text-xl font-black text-white shadow-md sm:h-13 sm:w-13">
              M
            </div>

            <div className="min-w-0">
              <p className="truncate text-base font-extrabold tracking-[0.12em] text-[#011C40] sm:text-lg">
                MALAPOTE
              </p>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#26658C] sm:text-[10px]">
                AgriStock Operations
              </p>
            </div>
          </div>

          <span className="hidden rounded-full border border-[#54ACBF]/40 bg-white/70 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[#26658C] sm:inline-flex">
            Staff Portal
          </span>
        </header>

        {/* Main content */}
        <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          {/* Introduction */}
          <div className="text-center lg:text-left">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#54ACBF]/30 bg-[#A7EBF2]/25 px-3.5 py-2">
              <span className="h-2 w-2 rounded-full bg-[#26658C]" />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#26658C] sm:text-xs">
                Authorized personnel only
              </span>
            </div>

            <h1 className="text-4xl font-extrabold leading-[1.12] tracking-tight text-[#011C40] sm:text-5xl md:text-6xl lg:text-7xl">
              From field
              <span className="block text-[#26658C]">to mill.</span>
            </h1>

            <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-slate-600 sm:text-base sm:leading-8 lg:mx-0 lg:text-lg">
              Manage Malapote Ricemill operations in one place. Access
              farm activities, mill production, inventory, sales, and
              administrative tools through one integrated portal.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/login"
                className="group inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#023859] px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#023859]/15 transition duration-200 hover:-translate-y-0.5 hover:bg-[#26658C] hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#54ACBF]/40 sm:w-auto"
              >
                Administrator Sign In
                <span
                  aria-hidden="true"
                  className="text-lg transition-transform duration-200 group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>

              <span className="text-xs text-slate-500">
                Secure access for authorized staff
              </span>
            </div>
          </div>

          {/* Operations card */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute -inset-3 rounded-[2rem] bg-[#54ACBF]/10 blur-xl" />

            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/20 bg-gradient-to-br from-[#011C40] via-[#023859] to-[#26658C] p-6 text-white shadow-[0_24px_70px_rgba(1,28,64,0.20)] sm:rounded-[2rem] sm:p-9 lg:p-10">
              {/* Decorative elements */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border-[30px] border-white/[0.06] sm:h-64 sm:w-64"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-[#A7EBF2]/[0.07] sm:h-64 sm:w-64"
              />

              <div className="relative z-10">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 sm:h-16 sm:w-16">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-7 w-7 text-[#A7EBF2] sm:h-8 sm:w-8"
                  >
                    <path
                      d="M4 20V9l8-5 8 5v11h-6v-6h-4v6H4Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8 11h.01M16 11h.01"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <p className="mt-8 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#A7EBF2] sm:text-xs">
                  Operations Dashboard
                </p>

                <h2 className="mt-3 text-2xl font-extrabold leading-tight sm:text-3xl">
                  Farm. Mill.
                  <br className="hidden sm:block" /> Sales. Office.
                </h2>

                <p className="mt-4 max-w-sm text-sm leading-7 text-blue-100/80 sm:text-base">
                  A centralized workspace for managing agricultural
                  activities and rice mill operations efficiently.
                </p>

                <div className="my-7 h-px w-full bg-white/15" />

                {/* Operations highlights */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Farm Management", number: "01" },
                    { label: "Mill Production", number: "02" },
                    { label: "Inventory & Sales", number: "03" },
                    { label: "Administration", number: "04" },
                  ].map((item) => (
                    <div
                      key={item.number}
                      className="rounded-xl border border-white/10 bg-white/[0.07] p-3 sm:p-4"
                    >
                      <span className="text-[10px] font-bold tracking-widest text-[#A7EBF2]">
                        {item.number}
                      </span>
                      <p className="mt-1 text-xs font-semibold text-white sm:text-sm">
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>

                <p className="mt-6 text-[11px] leading-5 text-blue-100/60">
                  Access is assigned and managed by authorized
                  administrators.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 border-t border-[#54ACBF]/20 pt-5 text-center sm:mt-16 sm:text-left">
          <p className="text-[10px] font-medium tracking-wide text-slate-500 sm:text-xs">
            © {new Date().getFullYear()} Malapote Ricemill · AgriStock
            Operations Portal
          </p>
        </footer>
      </div>
    </main>
  );
}
