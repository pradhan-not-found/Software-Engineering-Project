/**
 * Attendance Domain Service
 * Layer 3: Domain Service Layer
 * Business Logic: Clock In/Out, Half-Day threshold calculation, Shift Roster, and Admin Register
 */

import { AttendanceRepository } from "../repositories/attendance.repository";
import { EmployeeRepository } from "../repositories/employee.repository";
import type { Attendance, AttendanceStatus, Employee } from "../types";
import { today, uid, isAdminRole, hoursBetween, fullName } from "../utils";
import type { ClockInInput, SetAttendanceInput, SetShiftInput } from "../validations/attendance.schema";

export class AttendanceService {
  private attRepo: AttendanceRepository;
  private empRepo: EmployeeRepository;

  constructor(attRepo = new AttendanceRepository(), empRepo = new EmployeeRepository()) {
    this.attRepo = attRepo;
    this.empRepo = empRepo;
  }

  /**
   * Clock in employee for today
   */
  async clockIn(employeeId: string, input: ClockInInput): Promise<{ ok: true; data: Attendance } | { ok: false; error: string }> {
    const t = today();
    const existing = await this.attRepo.findRecord(employeeId, t);

    if (existing?.clockIn) {
      return { ok: false, error: "Already clocked in today." };
    }

    const record: Attendance = existing
      ? {
          ...existing,
          clockIn: new Date().toISOString(),
          status: input.remote ? "REMOTE" : "PRESENT",
        }
      : {
          id: uid("att"),
          employeeId,
          date: t,
          clockIn: new Date().toISOString(),
          clockOut: null,
          status: input.remote ? "REMOTE" : "PRESENT",
        };

    const saved = await this.attRepo.saveRecord(record);
    return { ok: true, data: saved };
  }

  /**
   * Clock out employee for today with Half-Day threshold calculation
   */
  async clockOut(employeeId: string): Promise<{ ok: true; data: Attendance } | { ok: false; error: string }> {
    const t = today();
    const existing = await this.attRepo.findRecord(employeeId, t);

    if (!existing?.clockIn) {
      return { ok: false, error: "You haven't clocked in yet." };
    }

    if (existing.clockOut) {
      return { ok: false, error: "Already clocked out." };
    }

    const clockOutTime = new Date().toISOString();
    const hrs = hoursBetween(existing.clockIn, clockOutTime);

    // Business rule: working less than 4 hours converts status to HALF_DAY
    let status = existing.status;
    if (hrs < 4 && status === "PRESENT") {
      status = "HALF_DAY";
    }

    const updated: Attendance = {
      ...existing,
      clockOut: clockOutTime,
      status,
    };

    const saved = await this.attRepo.saveRecord(updated);
    return { ok: true, data: saved };
  }

  /**
   * Manual attendance override by Admin/HR
   */
  async setManualAttendance(
    input: SetAttendanceInput,
    actor: Employee
  ): Promise<{ ok: true; data: Attendance } | { ok: false; error: string }> {
    if (!isAdminRole(actor.role)) {
      return { ok: false, error: "Only administrators can manually update attendance records." };
    }

    let existing = await this.attRepo.findRecord(input.employeeId, input.date);
    let clockIn = existing?.clockIn || null;
    let clockOut = existing?.clockOut || null;

    if ((input.status === "PRESENT" || input.status === "REMOTE") && !clockIn) {
      clockIn = new Date(`${input.date}T09:00:00`).toISOString();
      clockOut = new Date(`${input.date}T18:00:00`).toISOString();
    }

    const record: Attendance = {
      id: existing?.id || uid("att"),
      employeeId: input.employeeId,
      date: input.date,
      clockIn,
      clockOut,
      status: input.status,
    };

    const saved = await this.attRepo.saveRecord(record);
    return { ok: true, data: saved };
  }

  /**
   * Update shift assignment for employee
   */
  async setShift(input: SetShiftInput, actor: Employee): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!isAdminRole(actor.role)) {
      return { ok: false, error: "Only administrators can modify employee shifts." };
    }

    const success = await this.attRepo.setShift(input.employeeId, input.shift);
    if (!success) {
      return { ok: false, error: "Failed to update shift." };
    }

    return { ok: true };
  }

  /**
   * Get daily register records
   */
  async getDailyRegister(date: string): Promise<Attendance[]> {
    return this.attRepo.findAll({ date });
  }

  /**
   * Get monthly records for an employee or all employees
   */
  async getMonthlyRecords(month: string, employeeId?: string): Promise<Attendance[]> {
    return this.attRepo.findAll({ month, employeeId });
  }
}

