/**
 * Leave Domain Service & Connected Wedge Task-Flagging Engine
 * Layer 3: Service Layer
 */

import { leaveRepository } from "../repositories/leave.repository";
import { employeeRepository } from "../repositories/employee.repository";
import type { LeaveRequest } from "../types";
import type { LeaveRequestDTO } from "../validations/leave.schema";
import { uid, workingDays, rangesOverlap, LEAVE_TYPES, formatDate, fullName } from "../utils";

export type ServiceResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export class LeaveService {
  /**
   * List all leaves with optional filters
   */
  async listLeaves(filters?: { employeeId?: string; status?: string }) {
    return leaveRepository.findAll(filters);
  }

  /**
   * Get single leave by ID
   */
  async getLeaveById(id: string) {
    return leaveRepository.findById(id);
  }

  /**
   * Submit new leave request
   */
  async requestLeave(
    employeeId: string,
    input: LeaveRequestDTO
  ): Promise<ServiceResult<LeaveRequest>> {
    // 1. Check existing leaves for overlaps
    const existing = await leaveRepository.findAll({ employeeId });
    const hasOverlap = existing.some(
      (l) =>
        (l.status === "PENDING" || l.status === "APPROVED") &&
        rangesOverlap(l.startDate, l.endDate, input.startDate, input.endDate)
    );

    if (hasOverlap) {
      return { ok: false, error: "You already have a leave request overlapping these dates." };
    }

    // 2. Calculate working days (Mon-Fri)
    const days = workingDays(input.startDate, input.endDate, []);
    if (days === 0) {
      return { ok: false, error: "Selected range has no working days." };
    }

    // 3. Construct domain leave request
    const leave: LeaveRequest = {
      id: uid("l"),
      employeeId,
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate,
      days,
      reason: input.reason.trim(),
      status: "PENDING",
      approverId: null,
      createdAt: new Date().toISOString(),
    };

    const saved = await leaveRepository.create(leave);
    return { ok: true, data: saved };
  }

  /**
   * Connected Wedge #2: Atomic Leave Decision & Task Delay Signaling
   */
  async decideLeave(
    id: string,
    approve: boolean,
    approverId: string,
    comment?: string
  ): Promise<ServiceResult<{ leave: LeaveRequest; flaggedTasksCount: number }>> {
    const leave = await leaveRepository.findById(id);
    if (!leave) {
      return { ok: false, error: "Leave request not found." };
    }

    if (leave.status !== "PENDING") {
      return { ok: false, error: "This leave request has already been decided." };
    }

    if (leave.employeeId === approverId) {
      return { ok: false, error: "You cannot approve or reject your own leave request." };
    }

    const decision = approve ? "APPROVED" : "REJECTED";
    const updated = await leaveRepository.updateDecision(id, decision, approverId, comment);

    if (!updated) {
      return { ok: false, error: "Failed to update leave record." };
    }

    let flaggedTasksCount = 0;

    // Connected Wedge #2: Flag active tasks as DELAYED_ON_LEAVE
    if (approve) {
      const auditComment = `⚠ Auto-flagged: Employee is on leave ${formatDate(leave.startDate, false)} – ${formatDate(leave.endDate, false)}.`;
      flaggedTasksCount = await leaveRepository.flagTasksDelayedOnLeave(
        leave.employeeId,
        leave.startDate,
        leave.endDate,
        auditComment
      );
    }

    return {
      ok: true,
      data: {
        leave: updated,
        flaggedTasksCount,
      },
    };
  }

  /**
   * Cancel pending leave request
   */
  async cancelLeave(id: string, employeeId: string): Promise<ServiceResult> {
    const leave = await leaveRepository.findById(id);
    if (!leave) {
      return { ok: false, error: "Leave request not found." };
    }

    if (leave.employeeId !== employeeId) {
      return { ok: false, error: "You are not authorized to cancel this leave request." };
    }

    if (leave.status !== "PENDING") {
      return { ok: false, error: "Only pending leave requests can be cancelled." };
    }

    await leaveRepository.cancel(id);
    return { ok: true, data: undefined };
  }
}

export const leaveService = new LeaveService();

