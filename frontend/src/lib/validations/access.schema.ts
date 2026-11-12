// frontend/src/lib/validations/access.schema.ts
// Validation schemas for Page 10: Access Control & Role-Based Permissions (RBAC)

import type { Role, ModuleKey, AccountStatus } from "../types";

export const VALID_ROLES: Role[] = ["SUPER_ADMIN", "HR_ADMIN", "MANAGER", "EMPLOYEE"];

export const VALID_MODULES: ModuleKey[] = [
  "directory",
  "orgchart",
  "onboarding",
  "projects",
  "leaves",
  "attendance",
  "payroll",
  "expenses",
  "performance",
  "access",
];

export const VALID_ACCOUNT_STATUSES: AccountStatus[] = ["ACTIVE", "SUSPENDED"];

export interface SetRoleInput {
  employeeId: string;
  role: Role;
}

export interface SetAccountStatusInput {
  employeeId: string;
  status: AccountStatus;
}

export interface ResetPasswordInput {
  employeeId: string;
}

export interface TogglePermissionInput {
  role: Role;
  module: ModuleKey;
  enabled?: boolean;
}

export function validateSetRoleInput(body: unknown): { ok: true; data: SetRoleInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request payload." };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.employeeId !== "string" || !b.employeeId.trim()) {
    return { ok: false, error: "Target employee ID is required." };
  }

  if (typeof b.role !== "string" || !VALID_ROLES.includes(b.role as Role)) {
    return {
      ok: false,
      error: `Invalid role specified. Must be one of: ${VALID_ROLES.join(", ")}.`,
    };
  }

  return {
    ok: true,
    data: {
      employeeId: b.employeeId.trim(),
      role: b.role as Role,
    },
  };
}

export function validateSetAccountStatusInput(body: unknown): { ok: true; data: SetAccountStatusInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request payload." };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.employeeId !== "string" || !b.employeeId.trim()) {
    return { ok: false, error: "Target employee ID is required." };
  }

  if (typeof b.status !== "string" || !VALID_ACCOUNT_STATUSES.includes(b.status as AccountStatus)) {
    return {
      ok: false,
      error: `Invalid account status. Must be one of: ${VALID_ACCOUNT_STATUSES.join(", ")}.`,
    };
  }

  return {
    ok: true,
    data: {
      employeeId: b.employeeId.trim(),
      status: b.status as AccountStatus,
    },
  };
}

export function validateResetPasswordInput(body: unknown): { ok: true; data: ResetPasswordInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request payload." };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.employeeId !== "string" || !b.employeeId.trim()) {
    return { ok: false, error: "Target employee ID is required." };
  }

  return {
    ok: true,
    data: {
      employeeId: b.employeeId.trim(),
    },
  };
}

export function validateTogglePermissionInput(body: unknown): { ok: true; data: TogglePermissionInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request payload." };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.role !== "string" || !VALID_ROLES.includes(b.role as Role)) {
    return {
      ok: false,
      error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}.`,
    };
  }

  if (typeof b.module !== "string" || !VALID_MODULES.includes(b.module as ModuleKey)) {
    return {
      ok: false,
      error: `Invalid module. Must be one of: ${VALID_MODULES.join(", ")}.`,
    };
  }

  return {
    ok: true,
    data: {
      role: b.role as Role,
      module: b.module as ModuleKey,
      enabled: typeof b.enabled === "boolean" ? b.enabled : undefined,
    },
  };
}
