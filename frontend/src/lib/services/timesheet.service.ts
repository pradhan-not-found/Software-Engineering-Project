/**
 * Timesheets Domain Service
 * Layer 3: Domain Service Layer
 * Business Logic: Weekly Timesheet Drafts, Submission Gate, and Manager Approvals
 */

import { TimesheetRepository } from "../repositories/timesheet.repository";
import { EmployeeRepository } from "../repositories/employee.repository";
import type { Timesheet, Employee } from "../types";
import { uid, isAdminRole, getSubordinates, fullName } from "../utils";
import type { TimesheetSaveInput, TimesheetDecideInput } from "../validations/attendance.schema";

export class TimesheetService {
  private tsRepo: TimesheetRepository;
  private empRepo: EmployeeRepository;

  constructor(tsRepo = new TimesheetRepository(), empRepo = new EmployeeRepository()) {
    this.tsRepo = tsRepo;
    this.empRepo = empRepo;
  }

  /**
   * List timesheets by scope ('mine' or 'pending')
   */
  async listTimesheets(actor: Employee, scope: "mine" | "pending" = "mine"): Promise<Timesheet[]> {
    if (scope === "mine") {
      return this.tsRepo.findAll({ employeeId: actor.id });
    }

    // Pending timesheets for approval
    const pending = await this.tsRepo.findAll({ status: "SUBMITTED" });
    if (isAdminRole(actor.role)) {
      return pending;
    }

    // Manager only sees subordinates' submitted timesheets
    const employees = await this.empRepo.findAll();
    const subIds = new Set(getSubordinates(employees, actor.id).map((s) => s.id));
    return pending.filter((t) => subIds.has(t.employeeId));
  }

  /**
   * Save draft or submit timesheet for manager approval
   */
  async saveTimesheet(
    employeeId: string,
    input: TimesheetSaveInput,
    actor: Employee
  ): Promise<{ ok: true; data: Timesheet } | { ok: false; error: string }> {
    if (actor.id !== employeeId && !isAdminRole(actor.role)) {
      return { ok: false, error: "You can only manage your own timesheet." };
    }

    const existing = await this.tsRepo.findByWeek(employeeId, input.weekStart);
    if (existing && (existing.status === "SUBMITTED" || existing.status === "APPROVED")) {
      return { ok: false, error: "This timesheet is already submitted." };
    }

    // Validate hours if submitting
    if (input.submit) {
      const totalHours = input.entries.reduce(
        (sum, e) => sum + e.hours.reduce((sub, h) => sub + (Number(h) || 0), 0),
        0
      );
      if (totalHours === 0) {
        return { ok: false, error: "Log some hours before submitting." };
      }
    }

    const timesheet: Timesheet = {
      id: existing?.id || uid("ts"),
      employeeId,
      weekStart: input.weekStart,
      entries: input.entries,
      status: input.submit ? "SUBMITTED" : "DRAFT",
      submittedAt: input.submit ? new Date().toISOString() : undefined,
    };

    const saved = await this.tsRepo.save(timesheet);
    return { ok: true, data: saved };
  }

  /**
   * Approve or reject a submitted timesheet
   */
  async decideTimesheet(
    id: string,
    input: TimesheetDecideInput,
    actor: Employee
  ): Promise<{ ok: true; data: Timesheet } | { ok: false; error: string }> {
    const existing = await this.tsRepo.findById(id);
    if (!existing) {
      return { ok: false, error: "Timesheet not found." };
    }

    if (existing.status !== "SUBMITTED") {
      return { ok: false, error: "Only submitted timesheets can be decided." };
    }

    const employees = await this.empRepo.findAll();
    const canApprove =
      isAdminRole(actor.role) ||
      getSubordinates(employees, actor.id).some((s) => s.id === existing.employeeId);

    if (!canApprove) {
      return { ok: false, error: "You can only approve timesheets for your reporting line." };
    }

    const decided = await this.tsRepo.decide(
      id,
      input.approve ? "APPROVED" : "REJECTED",
      actor.id
    );

    if (!decided) {
      return { ok: false, error: "Failed to update timesheet decision." };
    }

    return { ok: true, data: decided };
  }
}
