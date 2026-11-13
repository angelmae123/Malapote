
import Link from "next/link";

export default function ShopLandingPage() {
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
        <header className="mb-12 flex items-center justify-between gap-3 sm:mb-16">
          <Link
            href="/shop"
            className="flex min-w-0 items-center gap-3 rounded-lg focus:outline-none focus:ring-4 focus:ring-[#54ACBF]/30"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#023859] text-xl font-black text-white shadow-md sm:h-13 sm:w-13">
              M
            </span>

            <span className="min-w-0">
              <span className="block truncate text-base font-extrabold tracking-[0.12em] text-[#011C40] sm:text-lg">
                MALAPOTE
              </span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-[#26658C] sm:text-[10px]">
                Rice Marketplace
              </span>
            </span>
          </Link>

          <Link
            href="/shop/login"
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-[#54ACBF]/40 bg-white/80 px-3.5 py-2 text-xs font-bold text-[#023859] transition hover:border-[#26658C] hover:bg-[#A7EBF2]/20 focus:outline-none focus:ring-4 focus:ring-[#54ACBF]/30 sm:px-5 sm:text-sm"
          >
            Customer Login
          </Link>
        </header>

        {/* Main content */}
        <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          {/* Introduction */}
          <div className="text-center lg:text-left">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#54ACBF]/30 bg-[#A7EBF2]/25 px-3.5 py-2">
              <span className="h-2 w-2 rounded-full bg-[#26658C]" />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#26658C] sm:text-xs">
                Welcome to Malapote Ricemill
              </span>
            </div>

            <h1 className="text-4xl font-extrabold leading-[1.12] tracking-tight text-[#011C40] sm:text-5xl md:text-6xl lg:text-7xl">
              Good food starts
              <span className="block text-[#26658C]">
                with good rice.
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-slate-600 sm:text-base sm:leading-8 lg:mx-0 lg:text-lg">
              Find quality rice for everyday meals, family gatherings,
              and everything in between. Explore our selection and
              bring home rice you can enjoy with every meal.
            </p>

            {/* Action buttons */}
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/shop/login"
                className="group inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#023859] px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#023859]/15 transition duration-200 hover:-translate-y-0.5 hover:bg-[#26658C] hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#54ACBF]/40 sm:w-auto"
              >
                Login to Shop
                <span
                  aria-hidden="true"
                  className="text-lg transition-transform duration-200 group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>

              <Link
                href="/shop/register"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[#54ACBF]/40 bg-white px-7 py-3.5 text-sm font-bold text-[#023859] transition duration-200 hover:-translate-y-0.5 hover:border-[#26658C] hover:bg-[#A7EBF2]/15 focus:outline-none focus:ring-4 focus:ring-[#54ACBF]/30 sm:w-auto"
              >
                Create Customer Account
              </Link>
            </div>

            <p className="mt-5 text-xs leading-5 text-slate-500">
              New to Malapote? Create an account to start shopping.
            </p>
          </div>

          {/* Rice feature card */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute -inset-3 rounded-[2rem] bg-[#54ACBF]/10 blur-xl" />

            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/20 bg-gradient-to-br from-[#011C40] via-[#023859] to-[#26658C] p-6 text-white shadow-[0_24px_70px_rgba(1,28,64,0.20)] sm:aspect-[1.1/1] sm:rounded-[2rem] sm:p-9">
              {/* Decorative elements */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border-[30px] border-white/[0.06] sm:h-64 sm:w-64"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-[#A7EBF2]/[0.07] sm:h-64 sm:w-64"
              />

              <div className="relative z-10 text-center">
                {/* Rice plant illustration */}
                <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] sm:h-48 sm:w-48">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 64 64"
                    fill="none"
                    className="h-24 w-24 sm:h-28 sm:w-28"
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
                      fill="#F4D58D"
                    />
                    <ellipse
                      cx="41"
                      cy="8"
                      rx="3.5"
                      ry="6"
                      transform="rotate(18 41 8)"
                      fill="#F4D58D"
                    />
                    <ellipse
                      cx="48"
                      cy="15"
                      rx="3.5"
                      ry="6"
                      transform="rotate(35 48 15)"
                      fill="#F4D58D"
                    />
                  </svg>
                </div>

                <p className="mt-6 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#A7EBF2] sm:text-xs">
                  Quality Grains
                </p>

                <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">
                  Made for Your Home
                </h2>

                <p className="mx-auto mt-3 max-w-xs text-xs leading-6 text-blue-100/75 sm:text-sm">
                  Good quality rice for your everyday meals and
                  special moments with family.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
<footer className="mt-12 border-t border-[#54ACBF]/20 pt-5 text-center sm:mt-16 sm:text-left">
  <p className="text-[10px] font-medium tracking-wide text-slate-500 sm:text-xs">
    © 2026 Malapote Ricemill · AgriStock
    Operations Portal
  </p>
</footer>
      </div>
    </main>
  );
}
