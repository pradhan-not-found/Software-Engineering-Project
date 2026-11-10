/**
 * Payroll Domain Service
 * Layer 3: Domain Service Layer
 * Business Logic: Monthly Payroll Generation, Loss of Pay (LOP) Deduction from Attendance & Unpaid Leave,
 * Tax/PF Computation, and Payslip Issuance.
 */

import { PayrollRepository } from "../repositories/payroll.repository";
import { EmployeeRepository } from "../repositories/employee.repository";
import { AttendanceRepository } from "../repositories/attendance.repository";
import { LeaveRepository } from "../repositories/leave.repository";
import type { PayrollRun, PayrollLine, Employee, SalaryStructure } from "../types";
import { uid, isAdminRole, computePayrollLine, workingDays, formatMonth, rangesOverlap } from "../utils";
import type { GeneratePayrollInput, SetPayrollStatusInput, UpdateSalaryInput } from "../validations/payroll.schema";

export class PayrollService {
  private payrollRepo: PayrollRepository;
  private empRepo: EmployeeRepository;
  private attRepo: AttendanceRepository;
  private leaveRepo: LeaveRepository;

  constructor(
    payrollRepo = new PayrollRepository(),
    empRepo = new EmployeeRepository(),
    attRepo = new AttendanceRepository(),
    leaveRepo = new LeaveRepository(),
  ) {
    this.payrollRepo = payrollRepo;
    this.empRepo = empRepo;
    this.attRepo = attRepo;
    this.leaveRepo = leaveRepo;
  }

  /**
   * List all payroll runs
   */
  async listRuns(): Promise<PayrollRun[]> {
    return this.payrollRepo.findAll();
  }

  /**
   * Get single run by ID
   */
  async getRun(id: string): Promise<PayrollRun | null> {
    return this.payrollRepo.findById(id);
  }

  /**
   * Generate monthly draft payroll run with Connected Wedge LOP computation
   */
  async generatePayroll(
    input: GeneratePayrollInput,
    actor: Employee
  ): Promise<{ ok: true; data: PayrollRun } | { ok: false; error: string }> {
    if (!isAdminRole(actor.role)) {
      return { ok: false, error: "Only administrators can generate payroll runs." };
    }

    const month = input.month;
    const existing = await this.payrollRepo.findByMonth(month);
    if (existing) {
      return { ok: false, error: `A payroll run for ${formatMonth(month)} already exists.` };
    }

    const monthStart = `${month}-01`;
    const [y, m] = month.split("-").map(Number);
    const monthEnd = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
    const wd = workingDays(monthStart, monthEnd, []);

    const [employees, attendance, leaves] = await Promise.all([
      this.empRepo.findAll(),
      this.attRepo.findAll({ month }),
      this.leaveRepo.findAll({ status: "APPROVED" }),
    ]);

    const eligible = employees.filter((e) => e.status !== "TERMINATED" && e.joiningDate <= monthEnd);

    const lines: PayrollLine[] = eligible.map((e) => {
      // 1. Attendance Loss of Pay: count absent days and half-days (0.5)
      const empAttendance = attendance.filter((a) => a.employeeId === e.id);
      const absentDays = empAttendance.filter((a) => a.status === "ABSENT").length;
      const halfDays = empAttendance.filter((a) => a.status === "HALF_DAY").length;

      // 2. Unpaid Leave Loss of Pay: count approved UNPAID leave working days
      const unpaidDays = leaves
        .filter((l) => l.employeeId === e.id && l.type === "UNPAID" && rangesOverlap(l.startDate, l.endDate, monthStart, monthEnd))
        .reduce((sum, l) => {
          const s = l.startDate < monthStart ? monthStart : l.startDate;
          const end = l.endDate > monthEnd ? monthEnd : l.endDate;
          return sum + workingDays(s, end, []);
        }, 0);

      const lopDays = absentDays + halfDays * 0.5 + unpaidDays;
      return computePayrollLine(e, { lopDays, workingDaysInMonth: wd || 22 });
    });

    const run: PayrollRun = {
      id: uid("pr"),
      month,
      status: "DRAFT",
      createdAt: new Date().toISOString(),
      lines,
      expenseIds: [],
    };

    const saved = await this.payrollRepo.save(run);
    return { ok: true, data: saved };
  }

  /**
   * Recalculate draft payroll run
   */
  async recalculatePayroll(
    id: string,
    actor: Employee
  ): Promise<{ ok: true; data: PayrollRun } | { ok: false; error: string }> {
    if (!isAdminRole(actor.role)) {
      return { ok: false, error: "Only administrators can recalculate payroll." };
    }

    const run = await this.payrollRepo.findById(id);
    if (!run) {
      return { ok: false, error: "Payroll run not found." };
    }

    if (run.status !== "DRAFT") {
      return { ok: false, error: "Only draft payroll runs can be recalculated." };
    }

    const employees = await this.empRepo.findAll();
    run.lines = run.lines.map((l) => {
      const e = employees.find((x) => x.id === l.employeeId);
      return e ? computePayrollLine(e, { reimbursements: l.reimbursements, lopDays: l.lopDays }) : l;
    });

    const saved = await this.payrollRepo.save(run);
    return { ok: true, data: saved };
  }

  /**
   * Update payroll run status (PROCESSED or PAID)
   */
  async setPayrollStatus(
    id: string,
    input: SetPayrollStatusInput,
    actor: Employee
  ): Promise<{ ok: true; data: PayrollRun } | { ok: false; error: string }> {
    if (!isAdminRole(actor.role)) {
      return { ok: false, error: "Only administrators can update payroll status." };
    }

    const run = await this.payrollRepo.findById(id);
    if (!run) {
      return { ok: false, error: "Payroll run not found." };
    }

    run.status = input.status;
    if (input.status === "PROCESSED") {
      run.processedAt = new Date().toISOString();
    } else if (input.status === "PAID") {
      run.paidAt = new Date().toISOString();
    }

    const saved = await this.payrollRepo.save(run);
    return { ok: true, data: saved };
  }

  /**
   * Delete payroll run (drafts only)
   */
  async deletePayrollRun(
    id: string,
    actor: Employee
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!isAdminRole(actor.role)) {
      return { ok: false, error: "Only administrators can delete payroll runs." };
    }

    const run = await this.payrollRepo.findById(id);
    if (!run) {
      return { ok: false, error: "Payroll run not found." };
    }

    if (run.status !== "DRAFT") {
      return { ok: false, error: "Only draft payroll runs can be deleted." };
    }

    await this.payrollRepo.delete(id);
    return { ok: true };
  }

  /**
   * Get employee payslips
   */
  async getEmployeePayslips(employeeId: string): Promise<{ run: PayrollRun; line: PayrollLine }[]> {
    const runs = await this.payrollRepo.findAll();
    return runs
      .filter((r) => r.status !== "DRAFT")
      .map((run) => ({ run, line: run.lines.find((l) => l.employeeId === employeeId)! }))
      .filter((x) => Boolean(x.line));
  }

  /**
   * Update employee salary structure
   */
  async updateSalary(
    input: UpdateSalaryInput,
    actor: Employee
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!isAdminRole(actor.role)) {
      return { ok: false, error: "Only administrators can update salary structures." };
    }

    const success = await this.payrollRepo.updateSalary(input.employeeId, input.salary);
    if (!success) {
      return { ok: false, error: "Failed to update salary structure." };
    }

    return { ok: true };
  }
}
