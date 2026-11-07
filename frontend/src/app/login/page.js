
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../providers";
import { apiRequest } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { saveSession } = useAuth();

  const [formData, setFormData] = useState({
    username_email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiRequest("auth/login", {
        method: "POST",
        body: {
          email: formData.username_email.trim(),
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

      if (
        !["super_admin", "admin", "section_admin"].includes(data.user.role)
      ) {
        setError(
          "This account does not have dashboard access. Ask an administrator to assign staff access."
        );
        return;
      }

      if (data.user.role === "section_admin" && !data.user.section) {
        setError(
          "This staff account has no assigned section. Ask an administrator to update the account."
        );
        return;
      }

      saveSession({
        user: data.user,
        accessToken: data.tokens.access_token,
        refreshToken: data.tokens.refresh_token,
      });

      // Clear login form after successful authentication
      setFormData({
        username_email: "",
        password: "",
      });

      router.replace("/dashboard");
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="h-dvh w-full flex overflow-hidden bg-white text-slate-800">
      <div className="hidden lg:flex lg:w-1/2 bg-blue-900 p-12 flex-col justify-between relative overflow-hidden text-white border-r border-blue-950/20">
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-blue-800 rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-blue-950 rounded-full blur-3xl opacity-60 pointer-events-none" />

        <div className="flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white text-blue-900 flex items-center justify-center font-bold text-lg shadow-md">
              M
            </div>
            <div>
              <h2 className="font-bold text-white tracking-wide text-sm">
                Malapote
              </h2>
              <p className="text-xs text-blue-200 tracking-wider uppercase">
                Ricemill · Agristock
              </p>
            </div>
          </div>
          <span className="text-xs tracking-widest uppercase py-1.5 px-3.5 rounded-full bg-blue-950/70 border border-blue-700/50 text-blue-100 font-medium">
            Grown with care
          </span>
        </div>

        <div className="my-auto z-10 max-w-lg py-12">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-300 mb-3">
            From Field to Mill
          </p>
          <h1 className="text-5xl font-serif tracking-tight leading-tight mb-6 font-light">
            Every harvest <br />
            <span className="font-normal italic text-blue-100">
              has a story.
            </span>
          </h1>
          <p className="text-blue-100/90 text-base leading-relaxed">
            One place to manage our harvest, operations, and the future of our
            farm.
          </p>
        </div>

        <div className="z-10 flex items-center justify-between text-xs text-blue-200/80 border-t border-blue-800/80 pt-6">
          <p className="italic">Harvest today. Prosper tomorrow.</p>
          <p className="tracking-widest uppercase font-mono text-[10px]">
            Malapote · Est. with purpose
          </p>
        </div>
      </div>

      <div className="h-dvh w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12 bg-slate-50 overflow-hidden">
        <div className="w-full max-w-md space-y-6 bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-100">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-900 mb-2">
              Welcome back
            </p>
            <h2 className="text-3xl font-serif font-semibold text-slate-900">
              Welcome back.
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Sign in to open your workspace.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            autoComplete="off"
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="username_email"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Email address
              </label>

              <input
                id="username_email"
                type="text"
                name="username_email"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={formData.username_email}
                onChange={handleChange}
                required
                placeholder="Email address or username"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                name="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-blue-900 hover:bg-blue-800 active:bg-blue-950 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-blue-900/25 transition flex items-center justify-center space-x-2"
            >
              <span>{loading ? "Signing in..." : "Sign in"}</span>

              {!loading && (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              )}
            </button>
          </form>

        </div>
      </div>
    </main>
  );
}
