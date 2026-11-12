/**
 * Reports & Analytics Domain Service
 * Layer 3: Service Layer
 */

import type { Role } from "../types";
import {
  reportRepository,
  ReportRepository,
  HeadcountReportData,
  AttendanceReportData,
  LeaveReportData,
  PayrollReportData,
  ProjectThroughputData,
  HeadcountExportRow,
} from "../repositories/report.repository";
import type { ReportFilterInput, ExportReportInput } from "../validations/report.schema";

export interface ActorContext {
  id: string;
  role: Role;
  firstName?: string;
  lastName?: string;
  departmentId?: string;
}

export interface ReportsOverviewResult {
  kpis: {
    headcount: number;
    departmentsCount: number;
    attendanceRate: number;
    remoteAttendanceRate: number;
    monthlyPayrollCost: number;
    projectTasksDone: number;
    projectTasksOpen: number;
  };
  headcount: HeadcountReportData;
  attendance: AttendanceReportData;
  leaves: LeaveReportData;
  payroll: PayrollReportData;
  throughput: ProjectThroughputData;
}

export class ReportService {
  constructor(private reportRepo: ReportRepository = reportRepository) {}

  /**
   * Complete Reports & Analytics Overview Payload
   */
  async getOverview(
    actor: ActorContext,
    filter?: ReportFilterInput
  ): Promise<{ ok: true; data: ReportsOverviewResult } | { ok: false; error: string }> {
    const deptFilter =
      actor.role === "EMPLOYEE" && actor.departmentId
        ? actor.departmentId
        : filter?.departmentId;

    const [headcount, attendance, leaves, payroll, throughput] = await Promise.all([
      this.reportRepo.getHeadcountMetrics(deptFilter),
      this.reportRepo.getAttendanceMetrics(30, deptFilter),
      this.reportRepo.getLeaveMetrics(),
      this.reportRepo.getPayrollMetrics(6),
      this.reportRepo.getProjectThroughput(),
    ]);

    const kpis = {
      headcount: headcount.active,
      departmentsCount: headcount.byDepartment.length,
      attendanceRate: attendance.rate,
      remoteAttendanceRate: attendance.remoteRate,
      monthlyPayrollCost: payroll.monthlyCommittedTotal,
      projectTasksDone: throughput.totalDone,
      projectTasksOpen: throughput.totalOpen,
    };

    return {
      ok: true,
      data: {
        kpis,
        headcount,
        attendance,
        leaves,
        payroll,
        throughput,
      },
    };
  }

  /**
   * Headcount Breakdown
   */
  async getHeadcountReport(
    actor: ActorContext,
    departmentId?: string
  ): Promise<{ ok: true; data: HeadcountReportData }> {
    const data = await this.reportRepo.getHeadcountMetrics(departmentId);
    return { ok: true, data };
  }

  /**
   * Attendance Breakdown
   */
  async getAttendanceReport(
    actor: ActorContext,
    days = 30,
    departmentId?: string
  ): Promise<{ ok: true; data: AttendanceReportData }> {
    const data = await this.reportRepo.getAttendanceMetrics(days, departmentId);
    return { ok: true, data };
  }

  /**
   * Payroll Trends & Commitments
   */
  async getPayrollReport(
    actor: ActorContext,
    limit = 6
  ): Promise<{ ok: true; data: PayrollReportData }> {
    const data = await this.reportRepo.getPayrollMetrics(limit);
    return { ok: true, data };
  }

  /**
   * Project Throughput & Top Contributors
   */
  async getThroughputReport(
    actor: ActorContext
  ): Promise<{ ok: true; data: ProjectThroughputData }> {
    const data = await this.reportRepo.getProjectThroughput();
    return { ok: true, data };
  }

  /**
   * Generate CSV export text for datasets
   */
  async exportCSV(
    actor: ActorContext,
    input: ExportReportInput
  ): Promise<{ ok: true; filename: string; mimeType: string; csv: string } | { ok: false; error: string }> {
    const dateStr = new Date().toISOString().slice(0, 10);

    if (input.dataset === "headcount") {
      const rows = await this.reportRepo.getHeadcountExportData(input.departmentId);
      const headers = [
        "Code",
        "Name",
        "Email",
        "Department",
        "Designation",
        "Role",
        "Manager",
        "Status",
        "Joined",
        "Location",
        "Work mode",
      ];

      const csvLines = [
        headers.map((h) => `"${h}"`).join(","),
        ...rows.map((r) =>
          [
            r.code,
            r.name,
            r.email,
            r.department,
            r.designation,
            r.role,
            r.manager,
            r.status,
            r.joined,
            r.location,
            r.workMode,
          ]
            .map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`)
            .join(",")
        ),
      ];

      return {
        ok: true,
        filename: `headcount-${dateStr}.csv`,
        mimeType: "text/csv",
        csv: csvLines.join("\n"),
      };
    }

    return {
      ok: false,
      error: `Unsupported export dataset: ${input.dataset}`,
    };
  }
}

export const reportService = new ReportService();

