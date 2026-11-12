/**
 * Reports & Analytics Data Access Layer (DAL)
 * Layer 2: Repository Layer
 */

import { supabase, isSupabaseConfigured } from "../supabase";
import type {
  Employee,
  Department,
  Attendance,
  LeaveRequest,
  PayrollRun,
  Project,
  Task,
  Board,
  LeaveTypeKey,
} from "../types";
import { createSeed } from "../seed";
import { LEAVE_TYPES, isTaskDone } from "../utils";

let inMemorySeed = createSeed();

function getFallbackData() {
  return inMemorySeed;
}

export interface HeadcountReportData {
  total: number;
  active: number;
  byDepartment: Array<{ id: string; name: string; count: number; color: string }>;
  statusDistribution: Record<string, number>;
}

export interface AttendanceReportData {
  rate: number;
  remoteRate: number;
  byDepartment: Array<{ id: string; name: string; rate: number; color: string }>;
}

export interface LeaveReportData {
  leaveUse: Array<{ key: string; label: string; used: number; allocated: number; color: string }>;
}

export interface PayrollReportData {
  trends: Array<{ id: string; month: string; gross: number; net: number }>;
  byDepartment: Array<{ id: string; name: string; cost: number; color: string }>;
  monthlyCommittedTotal: number;
}

export interface ProjectThroughputData {
  projects: Array<{ id: string; name: string; done: number; open: number; total: number }>;
  totalDone: number;
  totalOpen: number;
  topContributors: Array<{ id: string; name: string; email: string; completedCount: number }>;
}

export interface HeadcountExportRow {
  code: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  role: string;
  manager: string;
  status: string;
  joined: string;
  location: string;
  workMode: string;
}

export class ReportRepository {
  /**
   * Get Headcount & Department Distribution
   */
  async getHeadcountMetrics(departmentId?: string): Promise<HeadcountReportData> {
    const seed = getFallbackData();
    let employees = seed.employees;
    const departments = seed.departments;

    if (departmentId) {
      employees = employees.filter((e) => e.departmentId === departmentId);
    }

    const activeEmployees = employees.filter((e) => e.status !== "TERMINATED");

    const byDepartment = departments.map((d) => ({
      id: d.id,
      name: d.name,
      color: d.color,
      count: activeEmployees.filter((e) => e.departmentId === d.id).length,
    })).sort((a, b) => b.count - a.count);

    const statuses = ["ACTIVE", "ONBOARDING", "ON_LEAVE", "OFFBOARDING", "TERMINATED"];
    const statusDistribution: Record<string, number> = {};
    for (const s of statuses) {
      statusDistribution[s] = employees.filter((e) => e.status === s).length;
    }

    return {
      total: employees.length,
      active: activeEmployees.length,
      byDepartment,
      statusDistribution,
    };
  }

  /**
   * Get 30-Day Attendance & Remote Work Breakdown
   */
  async getAttendanceMetrics(days = 30, departmentId?: string): Promise<AttendanceReportData> {
    const seed = getFallbackData();
    const todayStr = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

    let recs = seed.attendance.filter(
      (a) => a.date >= startDate && a.date < todayStr && a.status !== "ON_LEAVE"
    );

    if (departmentId) {
      const deptEmpIds = new Set(
        seed.employees.filter((e) => e.departmentId === departmentId).map((e) => e.id)
      );
      recs = recs.filter((a) => deptEmpIds.has(a.employeeId));
    }

    const worked =
      recs.filter((a) => a.status === "PRESENT" || a.status === "REMOTE").length +
      recs.filter((a) => a.status === "HALF_DAY").length * 0.5;

    const rate = recs.length ? Math.round((worked / recs.length) * 100) : 0;
    const remoteRate = recs.length
      ? Math.round((recs.filter((a) => a.status === "REMOTE").length / recs.length) * 100)
      : 0;

    const byDepartment = seed.departments.map((d) => {
      const deptEmpIds = new Set(
        seed.employees.filter((e) => e.departmentId === d.id).map((e) => e.id)
      );
      const dRecs = recs.filter((a) => deptEmpIds.has(a.employeeId));
      const dWorked =
        dRecs.filter((a) => a.status === "PRESENT" || a.status === "REMOTE").length +
        dRecs.filter((a) => a.status === "HALF_DAY").length * 0.5;
      return {
        id: d.id,
        name: d.name,
        color: d.color,
        rate: dRecs.length ? Math.round((dWorked / dRecs.length) * 100) : 0,
      };
    });

    return {
      rate,
      remoteRate,
      byDepartment,
    };
  }

  /**
   * Get Leave Utilisation Metrics
   */
  async getLeaveMetrics(year = String(new Date().getFullYear())): Promise<LeaveReportData> {
    const seed = getFallbackData();
    const activeHeadcount = seed.employees.filter((e) => e.status !== "TERMINATED").length;

    const leaveUse = (Object.keys(LEAVE_TYPES) as LeaveTypeKey[]).map((k) => {
      const used = seed.leaves
        .filter((l) => l.type === k && l.status === "APPROVED" && l.startDate.startsWith(year))
        .reduce((sum, l) => sum + l.days, 0);

      const allocated = k === "UNPAID" ? 0 : LEAVE_TYPES[k].allocation * activeHeadcount;

      return {
        key: k,
        label: LEAVE_TYPES[k].label,
        used,
        allocated,
        color: LEAVE_TYPES[k].color,
      };
    });

    return { leaveUse };
  }

  /**
   * Get Payroll Expenditure Trends & Department Commitments
   */
  async getPayrollMetrics(limit = 6): Promise<PayrollReportData> {
    const seed = getFallbackData();
    const active = seed.employees.filter((e) => e.status !== "TERMINATED");

    const trends = [...seed.payrollRuns]
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-limit)
      .map((r) => ({
        id: r.id,
        month: r.month,
        gross: r.lines.reduce((s, l) => s + l.gross, 0),
        net: r.lines.reduce((s, l) => s + l.net, 0),
      }));

    const byDepartment = seed.departments
      .map((d) => {
        const cost = active
          .filter((e) => e.departmentId === d.id)
          .reduce((s, e) => s + (e.salary.basic + e.salary.hra + e.salary.allowances), 0);
        return {
          id: d.id,
          name: d.name,
          color: d.color,
          cost,
        };
      })
      .sort((a, b) => b.cost - a.cost);

    const monthlyCommittedTotal = byDepartment.reduce((s, x) => s + x.cost, 0);

    return {
      trends,
      byDepartment,
      monthlyCommittedTotal,
    };
  }

  /**
   * Get Project Throughput & Top Contributors
   */
  async getProjectThroughput(): Promise<ProjectThroughputData> {
    const seed = getFallbackData();
    const active = seed.employees.filter((e) => e.status !== "TERMINATED");

    const projects = seed.projects.map((p) => {
      const ts = seed.tasks.filter((tk) => {
        const board = seed.boards.find((b) => b.id === tk.boardId);
        return board?.projectId === p.id;
      });
      const done = ts.filter((tk) => isTaskDone(seed.boards, tk)).length;
      const open = ts.length - done;
      return {
        id: p.id,
        name: p.name,
        done,
        open,
        total: ts.length,
      };
    });

    const totalDone = projects.reduce((s, x) => s + x.done, 0);
    const totalOpen = projects.reduce((s, x) => s + x.open, 0);

    const since = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const topContributors = active
      .map((e) => {
        const count = seed.tasks.filter(
          (tk) =>
            tk.assigneeIds.includes(e.id) &&
            tk.completedAt &&
            tk.completedAt.slice(0, 10) >= since
        ).length;
        return {
          id: e.id,
          name: `${e.firstName} ${e.lastName}`,
          email: e.email,
          completedCount: count,
        };
      })
      .filter((x) => x.completedCount > 0)
      .sort((a, b) => b.completedCount - a.completedCount)
      .slice(0, 8);

    return {
      projects,
      totalDone,
      totalOpen,
      topContributors,
    };
  }

  /**
   * Fetch structured row data for Headcount CSV export
   */
  async getHeadcountExportData(departmentId?: string): Promise<HeadcountExportRow[]> {
    const seed = getFallbackData();
    let emps = seed.employees;

    if (departmentId) {
      emps = emps.filter((e) => e.departmentId === departmentId);
    }

    return emps.map((e) => {
      const dept = seed.departments.find((d) => d.id === e.departmentId)?.name || "";
      const mgr = seed.employees.find((m) => m.id === e.managerId);
      const mgrName = mgr ? `${mgr.firstName} ${mgr.lastName}` : "";
      return {
        code: e.code,
        name: `${e.firstName} ${e.lastName}`,
        email: e.email,
        department: dept,
        designation: e.designation,
        role: e.role,
        manager: mgrName,
        status: e.status,
        joined: e.joiningDate,
        location: e.location,
        workMode: e.workMode,
      };
    });
  }
}

export const reportRepository = new ReportRepository();
