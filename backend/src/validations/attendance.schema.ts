// frontend/src/lib/validations/attendance.schema.ts
// Validation schemas for Attendance, Shifts, and Timesheets

import type { AttendanceStatus, TimesheetStatus } from "../types";

export interface ClockInInput {
  remote?: boolean;
}

export interface SetAttendanceInput {
  employeeId: string;
  date: string;
  status: AttendanceStatus;
}

export interface SetShiftInput {
  employeeId: string;
  shift: string;
}

export interface TimesheetSaveInput {
  weekStart: string;
  entries: { projectId: string; hours: number[] }[];
  submit: boolean;
}

export interface TimesheetDecideInput {
  approve: boolean;
  comment?: string;
}

export function validateClockInInput(body: unknown): { ok: true; data: ClockInInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: true, data: { remote: false } };
  }
  const b = body as Record<string, unknown>;
  return { ok: true, data: { remote: Boolean(b.remote) } };
}

export function validateSetAttendanceInput(body: unknown): { ok: true; data: SetAttendanceInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request payload." };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.employeeId !== "string" || !b.employeeId.trim()) {
    return { ok: false, error: "Employee ID is required." };
  }

  if (typeof b.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(b.date.trim())) {
    return { ok: false, error: "Valid date in YYYY-MM-DD format is required." };
  }

  const validStatuses: AttendanceStatus[] = ["PRESENT", "ABSENT", "HALF_DAY", "REMOTE", "ON_LEAVE"];
  if (typeof b.status !== "string" || !validStatuses.includes(b.status as AttendanceStatus)) {
    return { ok: false, error: "Invalid attendance status." };
  }

  return {
    ok: true,
    data: {
      employeeId: b.employeeId.trim(),
      date: b.date.trim(),
      status: b.status as AttendanceStatus,
    },
  };
}

export function validateSetShiftInput(body: unknown): { ok: true; data: SetShiftInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request payload." };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.employeeId !== "string" || !b.employeeId.trim()) {
    return { ok: false, error: "Employee ID is required." };
  }

  if (typeof b.shift !== "string" || !b.shift.trim()) {
    return { ok: false, error: "Shift name is required." };
  }

  return {
    ok: true,
    data: {
      employeeId: b.employeeId.trim(),
      shift: b.shift.trim(),
    },
  };
}

export function validateTimesheetSaveInput(body: unknown): { ok: true; data: TimesheetSaveInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request payload." };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.weekStart !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(b.weekStart.trim())) {
    return { ok: false, error: "Valid week start date in YYYY-MM-DD format is required." };
  }

  if (!Array.isArray(b.entries)) {
    return { ok: false, error: "Timesheet entries must be an array." };
  }

  const sanitizedEntries: { projectId: string; hours: number[] }[] = [];
  for (const entry of b.entries) {
    if (!entry || typeof entry !== "object" || typeof entry.projectId !== "string" || !entry.projectId.trim()) {
      continue;
    }
    const rawHours = Array.isArray(entry.hours) ? entry.hours : [];
    const hours: number[] = [];
    for (let i = 0; i < 7; i++) {
      const h = Number(rawHours[i]) || 0;
      hours.push(Math.max(0, Math.min(24, h)));
    }
    sanitizedEntries.push({ projectId: entry.projectId.trim(), hours });
  }

  return {
    ok: true,
    data: {
      weekStart: b.weekStart.trim(),
      entries: sanitizedEntries,
      submit: Boolean(b.submit),
    },
  };
}

export function validateTimesheetDecideInput(body: unknown): { ok: true; data: TimesheetDecideInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request payload." };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.approve !== "boolean") {
    return { ok: false, error: "Approval decision (boolean) is required." };
  }

  return {
    ok: true,
    data: {
      approve: b.approve,
      comment: typeof b.comment === "string" ? b.comment.trim() : undefined,
    },
  };
}

