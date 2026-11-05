"use client";

import {
  Bell, CalendarDays, CheckSquare, Clock, Home, Network, Receipt, TrendingUp, User, Users, Wallet, UsersRound,
} from "lucide-react";
import AppShell, { type NavSection } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { getDirectReports, hasModule, isTaskDone } from "@/lib/utils";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const { db, user } = useStore();

  let sections: NavSection[] = [];
  if (db && user) {
    const reports = getDirectReports(db.employees, user.id);
    const openTasks = db.tasks.filter((t) => t.assigneeIds.includes(user.id) && !isTaskDone(db.boards, t)).length;
    const unread = db.notifications.filter((n) => n.recipientId === user.id && !n.read).length;
    const teamPending =
      db.leaves.filter((l) => l.status === "PENDING" && reports.some((r) => r.id === l.employeeId)).length +
      db.timesheets.filter((t) => t.status === "SUBMITTED" && reports.some((r) => r.id === t.employeeId)).length;

    sections = [
      { items: [{ name: "Employee Hub", href: "/employee", icon: <Home /> }] },
      {
        title: "My Work",
        items: [{ name: "My Tasks & Kanban", href: "/employee/tasks", icon: <CheckSquare />, badge: openTasks }],
      },
      {
        title: "Self Service",
        items: [
          { name: "My Leaves", href: "/employee/leaves", icon: <CalendarDays /> },
          { name: "Attendance & Timesheets", href: "/employee/attendance", icon: <Clock /> },
          { name: "Payslips", href: "/employee/payslips", icon: <Wallet /> },
          { name: "Expense Claims", href: "/employee/expenses", icon: <Receipt /> },
          { name: "Goals & Reviews", href: "/employee/performance", icon: <TrendingUp /> },
          { name: "My Profile", href: "/employee/profile", icon: <User /> },
        ],
      },
      {
        title: "Management",
        items: reports.length ? [{ name: "My Team", href: "/employee/team", icon: <UsersRound />, badge: teamPending }] : [],
      },
      {
        title: "Company",
        items: [
          hasModule(db, user.role, "directory") && { name: "Directory", href: "/employee/directory", icon: <Users /> },
          hasModule(db, user.role, "orgchart") && { name: "Org Chart", href: "/employee/org-chart", icon: <Network /> },
          { name: "Notifications", href: "/employee/notifications", icon: <Bell />, badge: unread },
        ].filter(Boolean) as NavSection["items"],
      },
    ];
  }

  return (
    <AppShell variant="employee" sections={sections}>
      {children}
    </AppShell>
  );
}
