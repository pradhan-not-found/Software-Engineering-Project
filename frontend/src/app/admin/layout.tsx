"use client";

import {
  CalendarCheck, Clock, FolderKanban, Gauge, LayoutDashboard, Network, Receipt,
  Settings, ShieldCheck, TrendingUp, UserPlus, Users, Wallet, Bell,
} from "lucide-react";
import AppShell, { type NavSection } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { hasModule } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { db, user } = useStore();

  let sections: NavSection[] = [];
  if (db && user) {
    const can = (m: Parameters<typeof hasModule>[2]) => hasModule(db, user.role, m);
    const pendingLeaves = db.leaves.filter((l) => l.status === "PENDING").length;
    const pendingExpenses = db.expenses.filter((x) => x.status === "PENDING").length;
    const pendingTimesheets = db.timesheets.filter((t) => t.status === "SUBMITTED").length;
    const unread = db.notifications.filter((n) => n.recipientId === user.id && !n.read).length;
    const onboarding = db.employees.filter((e) => e.status === "ONBOARDING" || e.status === "OFFBOARDING").length;

    sections = [
      { items: [{ name: "Admin Overview", href: "/admin", icon: <LayoutDashboard /> }] },
      {
        title: "Organization",
        items: [
          can("directory") && { name: "Company Directory", href: "/admin/directory", icon: <Users /> },
          can("orgchart") && { name: "Org Chart", href: "/admin/org-chart", icon: <Network /> },
          can("onboarding") && { name: "On/Offboarding", href: "/admin/onboarding", icon: <UserPlus />, badge: onboarding },
          can("access") && { name: "Access Control", href: "/admin/access", icon: <ShieldCheck /> },
        ].filter(Boolean) as NavSection["items"],
      },
      {
        title: "Work Management",
        items: [can("projects") && { name: "Projects & Boards", href: "/admin/projects", icon: <FolderKanban /> }].filter(Boolean) as NavSection["items"],
      },
      {
        title: "HR Operations",
        items: [
          can("leaves") && { name: "Leave Approvals", href: "/admin/leaves", icon: <CalendarCheck />, badge: pendingLeaves },
          can("attendance") && { name: "Attendance & Time", href: "/admin/attendance", icon: <Clock />, badge: pendingTimesheets },
          can("payroll") && { name: "Payroll Runs", href: "/admin/payroll", icon: <Wallet /> },
          can("expenses") && { name: "Expense Claims", href: "/admin/expenses", icon: <Receipt />, badge: pendingExpenses },
          can("performance") && { name: "Performance Cycles", href: "/admin/performance", icon: <TrendingUp /> },
        ].filter(Boolean) as NavSection["items"],
      },
      {
        title: "System",
        items: [
          { name: "Activity & Alerts", href: "/admin/notifications", icon: <Bell />, badge: unread },
          { name: "Reports", href: "/admin/reports", icon: <Gauge /> },
          { name: "Settings", href: "/admin/settings", icon: <Settings /> },
        ],
      },
    ];
  }

  return (
    <AppShell variant="admin" sections={sections}>
      {children}
    </AppShell>
  );
}
