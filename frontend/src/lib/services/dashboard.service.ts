/**
 * Dashboard Domain Service
 * Layer 3: Domain Service Layer
 * Business Logic: Executive KPI Aggregation, Live Capacity, Unified Approvals Inbox,
 * Connected Engine Signals, and Activity Stream.
 */

import { DashboardRepository } from "../repositories/dashboard.repository";
import type { Employee, ActivityItem, Task, LeaveRequest, Expense, Department } from "../types";
import { isAdminRole, today, fullName, openTasksFor, rangesOverlap } from "../utils";
import type { DashboardFilterInput } from "../validations/dashboard.schema";

export interface DashboardOverview {
  kpis: {
    totalHeadcount: number;
    newThisQuarter: number;
    onLeaveTodayCount: number;
    orgCapacityPct: number;
    clockedInCount: number;
    pendingApprovalsCount: number;
  };
  pendingInbox: {
    leaves: (LeaveRequest & {
      employeeName: string;
      tasksDueInWindow: number;
    })[];
    expenses: Expense[];
    pendingTimesheetsCount: number;
  };
  connectedSignals: {
    flaggedTasks: (Task & { assigneeName: string })[];
    onboardingCount: number;
    offboardingCount: number;
  };
  departments: {
    id: string;
    name: string;
    color: string;
    headcount: number;
  }[];
  activityFeed: ActivityItem[];
}

export class DashboardService {
  private dashRepo: DashboardRepository;

  constructor(dashRepo = new DashboardRepository()) {
    this.dashRepo = dashRepo;
  }

  /**
   * Get complete executive overview
   */
  async getOverview(
    actor: Employee,
    filter?: DashboardFilterInput
  ): Promise<{ ok: true; data: DashboardOverview } | { ok: false; error: string }> {
    if (!isAdminRole(actor.role)) {
      return { ok: false, error: "Only administrators can view the executive overview." };
    }

    const t = filter?.date || today();
    const snapshot = await this.dashRepo.getSnapshot(t);

    const activeEmployees = snapshot.employees.filter((e) => e.status !== "TERMINATED");
    const onLeaveToday = snapshot.leaves.filter(
      (l) => l.status === "APPROVED" && l.startDate <= t && l.endDate >= t
    );
    const capacity = activeEmployees.length
      ? Math.round(((activeEmployees.length - onLeaveToday.length) / activeEmployees.length) * 100)
      : 100;

    const quarterStartMonth = Math.floor(new Date().getMonth() / 3) * 3 + 1;
    const quarterStartDate = `${t.slice(0, 4)}-${String(quarterStartMonth).padStart(2, "0")}-01`;
    const newThisQuarter = activeEmployees.filter((e) => e.joiningDate >= quarterStartDate).length;

    const clockedIn = snapshot.attendance.filter((a) => Boolean(a.clockIn)).length;

    const pendingLeaves = snapshot.leaves.filter((l) => l.status === "PENDING");
    const pendingExpenses = snapshot.expenses.filter((x) => x.status === "PENDING");
    const pendingTimesheets = snapshot.timesheets.filter((x) => x.status === "SUBMITTED");

    // Connected Wedge signals: Flagged work due to HR leave or offboarding
    const flaggedTasks = snapshot.tasks
      .filter((t) => t.flag !== "NORMAL")
      .map((task) => {
        const who = snapshot.employees.find((e) => task.assigneeIds.includes(e.id));
        return {
          ...task,
          assigneeName: who ? fullName(who) : "Unassigned",
        };
      });

    // Enriched pending leaves with live workload context
    const enrichedPendingLeaves = pendingLeaves.map((l) => {
      const e = snapshot.employees.find((x) => x.id === l.employeeId);
      const empTasks = snapshot.tasks.filter((task) => task.assigneeIds.includes(l.employeeId));
      const dueInWindow = empTasks.filter(
        (task) => task.dueDate && task.dueDate >= l.startDate && task.dueDate <= l.endDate
      ).length;

      return {
        ...l,
        employeeName: e ? fullName(e) : "Employee",
        tasksDueInWindow: dueInWindow,
      };
    });

    const deptCounts = snapshot.departments.map((d) => ({
      id: d.id,
      name: d.name,
      color: d.color,
      headcount: activeEmployees.filter((e) => e.departmentId === d.id).length,
    }));

    const feedCategory = filter?.category || "ALL";
    const activityFeed = snapshot.activity
      .filter((a) => feedCategory === "ALL" || a.category === feedCategory)
      .slice(0, 15);

    return {
      ok: true,
      data: {
        kpis: {
          totalHeadcount: activeEmployees.length,
          newThisQuarter,
          onLeaveTodayCount: onLeaveToday.length,
          orgCapacityPct: capacity,
          clockedInCount: clockedIn,
          pendingApprovalsCount: pendingLeaves.length + pendingExpenses.length + pendingTimesheets.length,
        },
        pendingInbox: {
          leaves: enrichedPendingLeaves,
          expenses: pendingExpenses,
          pendingTimesheetsCount: pendingTimesheets.length,
        },
        connectedSignals: {
          flaggedTasks,
          onboardingCount: snapshot.employees.filter((e) => e.status === "ONBOARDING").length,
          offboardingCount: snapshot.employees.filter((e) => e.status === "OFFBOARDING").length,
        },
        departments: deptCounts,
        activityFeed,
      },
    };
  }
}

