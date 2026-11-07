import Link from "next/link";

export default function AdminLandingPage() {
  return (
    <main className="relative flex min-h-screen items-center overflow-hidden bg-[#f1f5fd] px-5 py-12 text-[#17345c] sm:px-8">
      <div className="pointer-events-none absolute -right-36 -top-40 h-[30rem] w-[30rem] rounded-full bg-blue-100/70" />
      <div className="pointer-events-none absolute -bottom-48 -left-32 h-[28rem] w-[28rem] rounded-full bg-indigo-100/60" />

      <div className="relative mx-auto w-full max-w-5xl">
        <header className="mb-16 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2458d8] text-xl font-black text-white shadow-sm">M</span>
          <span>
            <span className="block text-base font-extrabold tracking-wide">MALAPOTE</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">AgriStock operations</span>
          </span>
        </header>

        <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-[#2458d8]">Staff portal</p>
            <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-6xl">
              From field
              <span className="block text-[#2458d8]">to mill.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Manage Malapote Ricemill operations in one place. This portal is for authorized administrators and staff.
            </p>
            <Link
              href="/login"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-[#2458d8] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1749c4]"
            >
              Staff sign in <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#183b8b] via-[#2458d8] to-[#316cf5] p-8 text-white shadow-[0_24px_70px_rgba(37,84,190,0.2)] sm:p-10">
            <div className="absolute -right-14 -top-20 h-64 w-64 rounded-full border-[34px] border-white/[0.07]" />
            <div className="absolute -bottom-24 -left-14 h-64 w-64 rounded-full bg-white/[0.06]" />
            <div className="relative z-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-7 w-7">
                  <path d="M4 20V9l8-5 8 5v11h-6v-6h-4v6H4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M8 11h.01M16 11h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-blue-100">Operations dashboard</p>
              <h2 className="mt-2 text-2xl font-extrabold">Farm. Mill. Sales. Office.</h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-blue-100/90">
                Sign in with an account that has staff access. Access is assigned and managed by an administrator.
              </p>
            </div>
          </div>
        </section>

        <footer className="mt-16 border-t border-[#dce5f2] pt-5 text-xs text-slate-400">
          Malapote Ricemill · Authorized staff portal
        </footer>
      </div>
    </main>
  );
}
