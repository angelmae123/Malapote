"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../providers";
import { apiRequest } from "../../../lib/api";
import { toast } from "react-toastify";

export default function CustomerLoginPage() {
  const router = useRouter();
  const { saveSession } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);

    try {
      const data = await apiRequest("auth/login", {
        method: "POST",
        body: {
          email: formData.email.trim(),
          password: formData.password,
        },
      });

      if (
        !data.user ||
        !data.tokens?.access_token ||
        !data.tokens?.refresh_token
      ) {
        const detail =
          (typeof data === "object" && data !== null && data.error) ||
          (typeof data === "object" && data !== null && data.message) ||
          "The server returned an incomplete login response.";

        throw new Error(detail);
      }

      if (data.user.role !== "customer") {
        toast.error("This account is not a customer account. Please use your customer credentials.");
        return;
      }

      saveSession({
        user: data.user,
        accessToken: data.tokens.access_token,
        refreshToken: data.tokens.refresh_token,
      });
      router.replace("/shop/home");
    } catch (requestError) {
      toast.error(requestError.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh w-full bg-white text-slate-800">
      <div className="relative hidden min-h-dvh w-1/2 flex-col justify-between overflow-hidden border-r border-blue-950/20 bg-blue-900 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-blue-800 opacity-50 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-blue-950 opacity-60 blur-3xl" />

        <div className="z-10 flex items-center justify-between">
          <Link href="/shop/home" className="flex items-center space-x-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg font-bold text-blue-900 shadow-md">M</span>
            <span>
              <span className="block text-sm font-bold tracking-wide">Malapote</span>
              <span className="text-xs uppercase tracking-wider text-blue-200">Rice marketplace</span>
            </span>
          </Link>
          <span className="rounded-full border border-blue-700/50 bg-blue-950/70 px-3.5 py-1.5 text-xs font-medium uppercase tracking-widest text-blue-100">
            Grown with care
          </span>
        </div>

        <div className="z-10 my-auto max-w-lg py-12">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-blue-300">Welcome to the shop</p>
          <h1 className="mb-6 font-serif text-5xl font-light leading-tight tracking-tight">
            Good food starts <br />
            <span className="font-normal italic text-blue-100">with good rice.</span>
          </h1>
          <p className="text-base leading-relaxed text-blue-100/90">
            Sign in to explore quality rice from Malapote Ricemill, selected for your everyday table.
          </p>
        </div>

        <div className="z-10 flex items-center justify-between border-t border-blue-800/80 pt-6 text-xs text-blue-200/80">
          <p className="italic">Harvest today. Prosper tomorrow.</p>
          <p className="font-mono text-[10px] uppercase tracking-widest">Malapote · Est. with purpose</p>
        </div>
      </div>

      <div className="flex min-h-dvh w-full items-center justify-center overflow-y-auto bg-slate-50 p-4 sm:p-8 lg:w-1/2 lg:p-12">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-xl sm:p-8">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-900">Customer sign in</p>
            <h2 className="font-serif text-3xl font-semibold text-slate-900">Welcome back.</h2>
            <p className="mt-1 text-sm text-slate-500">Sign in to continue shopping.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="customer-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">Email address</label>
              <input
                id="customer-email"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Email address"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 transition placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
            <div>
              <label htmlFor="customer-password" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">Password</label>
              <input
                id="customer-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 transition placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center space-x-2 rounded-xl bg-blue-900 px-4 py-3.5 font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:bg-blue-800 active:bg-blue-950 disabled:opacity-50"
            >
              <span>{loading ? "Signing in..." : "Sign in"}</span>
              {!loading && (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0-7 7m7-7H3" />
                </svg>
              )}
            </button>
          </form>

          <div className="space-y-3 border-t border-slate-100 pt-3 text-center">
            <p className="text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <Link href="/shop/register" className="font-semibold text-blue-900 underline underline-offset-4 hover:text-blue-800">Register</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
