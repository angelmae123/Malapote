"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "../../../lib/api";

export default function CustomerRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const data = await apiRequest("auth/register", {
        method: "POST",
        body: {
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
        },
      });

      if (data.user?.role !== "customer") {
        throw new Error("The server did not create a customer account.");
      }

      router.replace("/shop/login");
    } catch (requestError) {
      setError(requestError.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh w-full bg-white text-slate-800">
      <div className="relative hidden min-h-dvh w-1/2 flex-col justify-between overflow-hidden border-r border-blue-950/20 bg-blue-900 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-blue-800 opacity-60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-blue-950 opacity-70 blur-3xl" />

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
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-blue-300">Join the Malapote shop</p>
          <h1 className="mb-6 font-serif text-5xl font-light leading-tight tracking-tight">
            Good rice for <br />
            <span className="font-normal italic text-blue-100">every table.</span>
          </h1>
          <p className="text-base leading-relaxed text-blue-100/90">
            Create your customer account to discover rice products and shop with Malapote Ricemill.
          </p>
        </div>

        <div className="z-10 flex items-center justify-between border-t border-blue-800/80 pt-6 text-xs text-blue-200/80">
          <p className="italic">Harvest today. Prosper tomorrow.</p>
          <p className="font-mono text-[10px] uppercase tracking-widest">Malapote · Est. with purpose</p>
        </div>
      </div>

      <div className="flex min-h-dvh w-full items-center justify-center overflow-y-auto bg-slate-50 p-3 sm:p-6 lg:w-1/2 lg:p-10">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-xl sm:p-7">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-900">Create customer account</p>
            <h2 className="font-serif text-3xl font-semibold text-slate-900">Get started.</h2>
            <p className="mt-1 text-sm text-slate-500">Register to shop for your favorite rice.</p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="customer-username" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Username</label>
              <input
                id="customer-username"
                name="username"
                type="text"
                autoComplete="username"
                maxLength={100}
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="Choose a username"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 transition placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
            <div>
              <label htmlFor="customer-register-email" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Email address</label>
              <input
                id="customer-register-email"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="name@example.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 transition placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
            <div>
              <label htmlFor="customer-register-password" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Password</label>
              <input
                id="customer-register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Create a password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 transition placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
            <div>
              <label htmlFor="customer-confirm-password" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Confirm password</label>
              <input
                id="customer-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Confirm your password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 transition placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex w-full items-center justify-center space-x-2 rounded-xl bg-blue-900 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:bg-blue-800 active:bg-blue-950 disabled:opacity-50"
            >
              <span>{loading ? "Creating account..." : "Register"}</span>
              {!loading && (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0-7 7m7-7H3" />
                </svg>
              )}
            </button>
          </form>

          <div className="space-y-3 border-t border-slate-100 pt-3 text-center">
            <p className="text-sm text-slate-600">
              Already have an account?{" "}
              <Link href="/shop/login" className="font-semibold text-blue-900 underline underline-offset-4 hover:text-blue-800">Sign in</Link>
            </p>
            <p className="text-xs leading-relaxed text-slate-400">
              Customer registration is separate from staff access.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
