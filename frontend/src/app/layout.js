import "./globals.css";
import { AuthProvider } from "./providers";

export const metadata = {
  title: "Malapote Ricemill | AgriStock",
  description: "Farm, mill, sales, and office management for Malapote Ricemill.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="m-0 min-h-dvh bg-white font-[Arial,Helvetica,sans-serif] text-slate-800 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
