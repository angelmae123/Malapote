// src/app/dashboard/layout.js
import DashboardShell from "../../components/dashboard/DashboardShell";

export default function DashboardLayout({ children }) {
  return <DashboardShell>{children}</DashboardShell>;
}