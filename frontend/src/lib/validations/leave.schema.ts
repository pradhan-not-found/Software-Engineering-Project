/**
 * Leave Management Validation Schemas
 * Layer 2 / Validation Layer
 */

import type { LeaveTypeKey } from "../types";

export interface LeaveRequestDTO {
  type: LeaveTypeKey;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface LeaveDecisionDTO {
  approve: boolean;
  comment?: string;
}

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const VALID_LEAVE_TYPES: LeaveTypeKey[] = ["ANNUAL", "SICK", "CASUAL", "PARENTAL", "UNPAID"];

export function validateLeaveRequestInput(body: unknown): ValidationResult<LeaveRequestDTO> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid JSON request payload." };
  }

  const b = body as Record<string, unknown>;

  const type = b.type as LeaveTypeKey;
  if (!VALID_LEAVE_TYPES.includes(type)) {
    return { ok: false, error: "Invalid leave type selected." };
  }

  const startDate = typeof b.startDate === "string" ? b.startDate.trim() : "";
  const endDate = typeof b.endDate === "string" ? b.endDate.trim() : "";

  if (!startDate || !endDate) {
    return { ok: false, error: "Both start date and end date are required." };
  }

  if (endDate < startDate) {
    return { ok: false, error: "End date must be on or after start date." };
  }

  const reason = typeof b.reason === "string" ? b.reason.trim() : "";
  if (!reason) {
    return { ok: false, error: "Please provide a reason for the leave request." };
  }

  return {
    ok: true,
    data: {
      type,
      startDate,
      endDate,
      reason,
    },
  };
}

export function validateLeaveDecisionInput(body: unknown): ValidationResult<LeaveDecisionDTO> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid JSON request payload." };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.approve !== "boolean") {
    return { ok: false, error: "Decision approval state (boolean) is required." };
  }

  const comment = typeof b.comment === "string" ? b.comment.trim() : undefined;

  return {
    ok: true,
    data: {
      approve: b.approve,
      comment,
    },
  };
}
