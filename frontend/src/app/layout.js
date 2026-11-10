import "./globals.css";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";
import { AuthProvider } from "./providers";

export const metadata = {
  title: "Malapote Ricemill | AgriStock",
  description: "Farm, mill, sales, and office management for Malapote Ricemill.",
};
export default function RootLayout({ children }) {
  if (!toast.notice) {
    toast.notice = toast.info;
  }

  return (
    <html lang="en">
      <body className="m-0 min-h-dvh bg-white font-[Arial,Helvetica,sans-serif] text-slate-800 antialiased">
        <AuthProvider>
          {children}
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnHover
            draggable
          />
        </AuthProvider>
      </body>
    </html>
  );
}
