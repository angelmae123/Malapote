import Link from "next/link";

export default function ShopLandingPage() {
  return (
    <main className="relative flex min-h-screen items-center overflow-hidden bg-[#f1f5fd] px-5 py-12 text-[#17345c] sm:px-8">
      <div className="pointer-events-none absolute -right-36 -top-40 h-[30rem] w-[30rem] rounded-full bg-blue-100/70" />
      <div className="pointer-events-none absolute -bottom-48 -left-32 h-[28rem] w-[28rem] rounded-full bg-indigo-100/60" />

      <div className="relative mx-auto w-full max-w-6xl">
        <header className="mb-16 flex items-center justify-between gap-4">
          <Link href="/shop" className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2458d8] text-xl font-black text-white shadow-sm">M</span>
            <span>
              <span className="block text-base font-extrabold tracking-wide">MALAPOTE</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Rice marketplace</span>
            </span>
          </Link>
          <Link
            href="/shop/login"
            className="rounded-xl border border-[#d7e1ef] bg-white px-4 py-2.5 text-sm font-bold text-[#17345c] transition hover:border-[#2458d8] hover:text-[#2458d8]"
          >
            Customer login
          </Link>
        </header>

        <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-[#2458d8]">Welcome to Malapote Ricemill</p>
            <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-6xl">
              Good food starts
              <span className="block text-[#2458d8]">with good rice.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Find quality rice for everyday meals, family gatherings, and everything in between. Sign in or create an account to visit our shop.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/shop/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2458d8] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1749c4]"
              >
                Login to shop <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/shop/register"
                className="inline-flex items-center justify-center rounded-xl border border-[#d7e1ef] bg-white px-6 py-3.5 text-sm font-bold text-[#17345c] transition hover:border-[#2458d8] hover:text-[#2458d8]"
              >
                Create customer account
              </Link>
            </div>
          </div>

          <div className="relative mx-auto flex aspect-square w-full max-w-md items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#2149aa] via-[#285dd5] to-[#316cf5] p-8 text-white shadow-[0_24px_70px_rgba(37,84,190,0.2)] sm:aspect-[1.1/1]">
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full border-[34px] border-white/[0.07]" />
            <div className="absolute -bottom-24 -left-14 h-64 w-64 rounded-full bg-white/[0.06]" />
            <div className="relative z-10 text-center">
              <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-white/10 sm:h-48 sm:w-48">
                <svg aria-hidden="true" viewBox="0 0 64 64" fill="none" className="h-24 w-24 sm:h-28 sm:w-28">
                  <path d="M32 54V13" stroke="#55A94F" strokeWidth="3" strokeLinecap="round" />
                  <path d="M31 34c-10 0-15-6-15-13 8 0 14 4 15 13Z" fill="#76C567" />
                  <path d="M33 25c1-8 7-13 15-13 0 7-5 13-15 13Z" fill="#8AD271" />
                  <path d="M32 46c-8 0-12-5-12-11 7 0 11 4 12 11Z" fill="#76C567" />
                  <ellipse cx="22" cy="14" rx="3.5" ry="6" transform="rotate(-24 22 14)" fill="#FFC947" />
                  <ellipse cx="41" cy="8" rx="3.5" ry="6" transform="rotate(18 41 8)" fill="#FFC947" />
                  <ellipse cx="48" cy="15" rx="3.5" ry="6" transform="rotate(35 48 15)" fill="#FFC947" />
                </svg>
              </div>
              <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-blue-100">Quality grains</p>
              <p className="mt-1 text-xl font-extrabold sm:text-2xl">Made for your home</p>
            </div>
          </div>
        </section>

        <footer className="mt-16 border-t border-[#dce5f2] pt-5 text-xs text-slate-400">
          Malapote Ricemill · Harvest today. Prosper tomorrow.
        </footer>
      </div>
    </main>
  );
}
