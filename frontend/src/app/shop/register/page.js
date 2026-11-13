
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "../../../lib/api";
import { toast } from "react-toastify";

export default function CustomerRegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    contactNumber: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (formData.contactNumber.trim() === "") {
      toast.error("Please enter your contact number.");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const data = await apiRequest("auth/register", {
        method: "POST",
        body: {
          username: formData.username.trim(),
          email: formData.email.trim(),
          contact_number: formData.contactNumber.trim(),
          password: formData.password,
        },
      });

      if (data.user?.role !== "customer") {
        throw new Error(
          "The server did not create a customer account."
        );
      }

      toast.success(
        "Registration successful! Please check your email for verification instructions."
      );

      router.replace("/shop/login");
    } catch (requestError) {
      toast.error(
        requestError.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh w-full overflow-x-hidden bg-[#F4F8FC] text-[#011C40] lg:min-h-screen lg:overflow-hidden">
      {/* Background decoration for mobile */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -right-24 -top-24 h-72 w-72 rounded-full bg-[#A7EBF2]/30 blur-3xl lg:hidden"
      />

      {/* Left branding panel */}
      <section className="relative hidden min-h-screen w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#011C40] via-[#023859] to-[#26658C] p-10 text-white lg:flex xl:p-14">
        {/* Decorative elements */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#54ACBF]/15 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -left-24 h-96 w-96 rounded-full bg-[#A7EBF2]/10 blur-3xl"
        />

        {/* Header */}
        <header className="relative z-10 flex items-center justify-between gap-4">
          <Link
            href="/shop"
            className="flex items-center gap-3"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl font-black text-[#023859] shadow-lg">
              M
            </span>

            <span>
              <span className="block text-base font-extrabold tracking-[0.12em]">
                MALAPOTE
              </span>

              <span className="block text-[10px] font-bold uppercase tracking-[0.17em] text-[#A7EBF2]">
                Rice Marketplace
              </span>
            </span>
          </Link>

          <span className="rounded-full border border-white/15 bg-white/[0.08] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#A7EBF2]">
            Grown with Care
          </span>
        </header>

        {/* Main branding content */}
        <div className="relative z-10 my-auto max-w-xl py-14">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-[#A7EBF2]" />

            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A7EBF2]">
              Join the Malapote Shop
            </span>
          </div>

          <h1 className="text-5xl font-extrabold leading-[1.12] tracking-tight xl:text-6xl 2xl:text-7xl">
            Good rice for
            <span className="mt-2 block text-[#A7EBF2]">
              every table.
            </span>
          </h1>

          <p className="mt-7 max-w-md text-sm leading-8 text-blue-100/80 xl:text-base">
            Create your customer account to discover quality rice
            products and enjoy convenient shopping with Malapote Ricemill.
          </p>

          {/* Registration highlights */}
          <div className="mt-10 grid max-w-md grid-cols-2 gap-3">
            {[
              "Quality Rice",
              "Easy Registration",
              "Convenient Shopping",
              "Order Tracking",
            ].map((item, index) => (
              <div
                key={item}
                className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#54ACBF]/20 text-[10px] font-bold text-[#A7EBF2]">
                  0{index + 1}
                </span>

                <span className="text-xs font-semibold text-white/90">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-6 text-[10px] text-blue-100/60">
          <p className="italic">
            Harvest today. Prosper tomorrow.
          </p>

          <p className="font-semibold uppercase tracking-[0.14em]">
            Malapote Ricemill
          </p>
        </footer>
      </section>

      {/* Registration form section */}
      <section className="relative flex min-h-dvh w-full items-center justify-center px-4 py-8 sm:px-8 lg:min-h-screen lg:w-1/2 lg:overflow-y-auto lg:px-10 lg:py-10 xl:px-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[#54ACBF]/10 blur-3xl"
        />

        <div className="relative w-full max-w-md">
          {/* Mobile branding */}
          <div className="mb-7 flex flex-col items-center text-center lg:hidden">
            <Link
              href="/shop"
              className="flex items-center gap-3"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#023859] text-xl font-black text-white shadow-md">
                M
              </span>

              <span className="text-left">
                <span className="block text-base font-extrabold tracking-[0.12em] text-[#011C40]">
                  MALAPOTE
                </span>

                <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#26658C]">
                  Rice Marketplace
                </span>
              </span>
            </Link>
          </div>

          {/* Registration card */}
          <div className="rounded-[1.5rem] border border-[#54ACBF]/15 bg-white p-5 shadow-[0_20px_60px_rgba(1,28,64,0.08)] sm:rounded-[2rem] sm:p-8 lg:p-9">
            {/* Form heading */}
            <div className="mb-6">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#54ACBF]/25 bg-[#A7EBF2]/20 px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#26658C]" />

                <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#26658C]">
                  Customer Registration
                </span>
              </div>

              <h2 className="text-3xl font-extrabold tracking-tight text-[#011C40] sm:text-4xl">
                Get started.
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Create your account and start shopping with Malapote.
              </p>
            </div>

            {/* Registration form */}
            <form
              onSubmit={handleSubmit}
              autoComplete="on"
              className="space-y-4"
            >
              {/* Username */}
              <div>
                <label
                  htmlFor="customer-username"
                  className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#023859]"
                >
                  Username
                </label>

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
                  className="w-full rounded-xl border border-slate-200 bg-[#F4F8FC] px-4 py-3 text-sm text-[#011C40] outline-none transition placeholder:text-slate-400 hover:border-[#54ACBF]/60 focus:border-[#26658C] focus:ring-4 focus:ring-[#54ACBF]/15"
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="customer-register-email"
                  className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#023859]"
                >
                  Email Address
                </label>

                <input
                  id="customer-register-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-[#F4F8FC] px-4 py-3 text-sm text-[#011C40] outline-none transition placeholder:text-slate-400 hover:border-[#54ACBF]/60 focus:border-[#26658C] focus:ring-4 focus:ring-[#54ACBF]/15"
                />
              </div>

              {/* Contact number */}
              <div>
                <label
                  htmlFor="customer-contact-number"
                  className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#023859]"
                >
                  Contact Number
                </label>

                <input
                  id="customer-contact-number"
                  name="contactNumber"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  maxLength={20}
                  value={formData.contactNumber}
                  onChange={handleChange}
                  required
                  placeholder="e.g. 09XXXXXXXXX"
                  className="w-full rounded-xl border border-slate-200 bg-[#F4F8FC] px-4 py-3 text-sm text-[#011C40] outline-none transition placeholder:text-slate-400 hover:border-[#54ACBF]/60 focus:border-[#26658C] focus:ring-4 focus:ring-[#54ACBF]/15"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="customer-register-password"
                  className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#023859]"
                >
                  Password
                </label>

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
                  className="w-full rounded-xl border border-slate-200 bg-[#F4F8FC] px-4 py-3 text-sm text-[#011C40] outline-none transition placeholder:text-slate-400 hover:border-[#54ACBF]/60 focus:border-[#26658C] focus:ring-4 focus:ring-[#54ACBF]/15"
                />

                <p className="mt-1.5 text-[11px] text-slate-400">
                  Use at least 8 characters.
                </p>
              </div>

              {/* Confirm password */}
              <div>
                <label
                  htmlFor="customer-confirm-password"
                  className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#023859]"
                >
                  Confirm Password
                </label>

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
                  className="w-full rounded-xl border border-slate-200 bg-[#F4F8FC] px-4 py-3 text-sm text-[#011C40] outline-none transition placeholder:text-slate-400 hover:border-[#54ACBF]/60 focus:border-[#26658C] focus:ring-4 focus:ring-[#54ACBF]/15"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group mt-2 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#023859] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#023859]/15 transition duration-200 hover:-translate-y-0.5 hover:bg-[#26658C] hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#54ACBF]/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                <span>
                  {loading ? "Creating account..." : "Create Customer Account"}
                </span>

                {!loading && (
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M14 5l7 7m0 0-7 7m7-7H3"
                    />
                  </svg>
                )}
              </button>
            </form>

            {/* Login link */}
            <div className="mt-6 border-t border-slate-100 pt-5 text-center">
              <p className="text-sm text-slate-600">
                Already have an account?{" "}
                <Link
                  href="/shop/login"
                  className="font-bold text-[#26658C] underline decoration-[#54ACBF]/50 underline-offset-4 transition hover:text-[#023859]"
                >
                  Sign in
                </Link>
              </p>
            </div>


          {/* Footer */}
          <footer className="mt-12 border-t border-[#54ACBF]/20 pt-5 text-center sm:mt-16 sm:text-left">
            <p className="text-[10px] font-medium tracking-wide text-slate-500 sm:text-xs">
              © 2026 Malapote Ricemill · AgriStock
              Operations Portal
            </p>
          </footer>
        </div>
        </div>
      </section>
    </main>
  );
}
