// backend/src/validations/settings.schema.ts
// Validation schemas for Page 12: Organization Settings, Workspaces & Holiday Calendar

import type { Holiday } from "../types";

export const VALID_HOLIDAY_TYPES: Holiday["type"][] = ["National", "Regional", "Company"];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export interface UpdateOrgInput {
  name?: string;
  currency?: string;
  timezone?: string;
}

export interface CreateDepartmentInput {
  name: string;
  code: string;
  color?: string;
  headId?: string | null;
}

export interface CreateHolidayInput {
  date: string;
  name: string;
  type: Holiday["type"];
}

export function validateUpdateOrgInput(
  body: unknown
): { ok: true; data: UpdateOrgInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request payload." };
  }

  const b = body as Record<string, unknown>;
  const result: UpdateOrgInput = {};

  if (b.name !== undefined) {
    if (typeof b.name !== "string" || b.name.trim().length < 2) {
      return { ok: false, error: "Organization name must be at least 2 characters." };
    }
    result.name = b.name.trim();
  }

  if (b.currency !== undefined) {
    if (typeof b.currency !== "string" || !b.currency.trim()) {
      return { ok: false, error: "Currency is required." };
    }
    result.currency = b.currency.trim().toUpperCase();
  }

  if (b.timezone !== undefined) {
    if (typeof b.timezone !== "string" || !b.timezone.trim()) {
      return { ok: false, error: "Timezone is required." };
    }
    result.timezone = b.timezone.trim();
  }

  return { ok: true, data: result };
}

export function validateCreateDepartmentInput(
  body: unknown
): { ok: true; data: CreateDepartmentInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request payload." };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.name !== "string" || b.name.trim().length < 2) {
    return { ok: false, error: "Department name must be at least 2 characters." };
  }

  if (typeof b.code !== "string" || !/^[A-Za-z0-9_-]{2,10}$/.test(b.code.trim())) {
    return { ok: false, error: "Department code must be 2 to 10 alphanumeric characters." };
  }

  return {
    ok: true,
    data: {
      name: b.name.trim(),
      code: b.code.trim().toUpperCase(),
      color: typeof b.color === "string" && b.color.trim() ? b.color.trim() : "blue",
      headId: typeof b.headId === "string" && b.headId.trim() ? b.headId.trim() : null,
    },
  };
}

export function validateCreateHolidayInput(
  body: unknown
): { ok: true; data: CreateHolidayInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request payload." };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.date !== "string" || !DATE_REGEX.test(b.date.trim())) {
    return { ok: false, error: "Holiday date must be formatted YYYY-MM-DD." };
  }

  if (typeof b.name !== "string" || b.name.trim().length < 2) {
    return { ok: false, error: "Holiday name must be at least 2 characters." };
  }

  if (typeof b.type !== "string" || !VALID_HOLIDAY_TYPES.includes(b.type as Holiday["type"])) {
    return {
      ok: false,
      error: `Holiday type must be one of: ${VALID_HOLIDAY_TYPES.join(", ")}.`,
    };
  }

  return {
    ok: true,
    data: {
      date: b.date.trim(),
      name: b.name.trim(),
      type: b.type as Holiday["type"],
    },
  };
}
