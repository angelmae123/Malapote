"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../providers";
import { apiRequest } from "../../lib/api";

export default function ShopLogoutButton({ className = "" }) {
  const router = useRouter();
  const { session, clearSession } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      if (session?.refreshToken) {
        await apiRequest("auth/logout", {
          method: "POST",
          token: session.accessToken,
          body: { refresh_token: session.refreshToken },
        });
      }
    } catch (error) {
      console.error("Unable to revoke shop session:", error);
    } finally {
      clearSession();
      router.replace("/shop/login");
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loggingOut}
      className={`rounded-lg px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60 ${className}`}
    >
      {loggingOut ? "Logging out..." : "Log out"}
    </button>
  );
}
