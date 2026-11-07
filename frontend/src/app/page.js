import { headers } from "next/headers";
import CustomerShopLandingPage from "./shop/page";
import AdminLandingPage from "./admin/page";

export const instant = false;

function getHostname(value) {
  if (!value) return "";

  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export default async function HomePage() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const hostname = getHostname(host?.split(",")[0].trim());
  const shopDomain = getHostname(process.env.SHOP_DOMAIN);
  const adminDomain = getHostname(process.env.ADMIN_DOMAIN);

  if (adminDomain && hostname === adminDomain) {
    return <AdminLandingPage />;
  }

  if (shopDomain && hostname === shopDomain) {
    return <CustomerShopLandingPage />;
  }

  if (process.env.PORTAL === "admin") {
    return <AdminLandingPage />;
  }

  return <CustomerShopLandingPage />;
}
