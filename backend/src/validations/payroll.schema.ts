// frontend/src/lib/validations/payroll.schema.ts
// Validation schemas for Payroll Runs, Deductions, and Salary Structures

import type { SalaryStructure } from "../types";

export interface GeneratePayrollInput {
  month: string;
}

export interface SetPayrollStatusInput {
  status: "PROCESSED" | "PAID";
}

export interface UpdateSalaryInput {
  employeeId: string;
  salary: SalaryStructure;
}

export function validateGeneratePayrollInput(body: unknown): { ok: true; data: GeneratePayrollInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request payload." };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.month !== "string" || !/^\d{4}-\d{2}$/.test(b.month.trim())) {
    return { ok: false, error: "Valid pay period in YYYY-MM format is required." };
  }

  return {
    ok: true,
    data: { month: b.month.trim() },
  };
}

export function validateSetPayrollStatusInput(body: unknown): { ok: true; data: SetPayrollStatusInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request payload." };
  }

  const b = body as Record<string, unknown>;

  if (b.status !== "PROCESSED" && b.status !== "PAID") {
    return { ok: false, error: "Status must be either 'PROCESSED' or 'PAID'." };
  }

  return {
    ok: true,
    data: { status: b.status },
  };
}

export function validateUpdateSalaryInput(body: unknown): { ok: true; data: UpdateSalaryInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request payload." };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.employeeId !== "string" || !b.employeeId.trim()) {
    return { ok: false, error: "Employee ID is required." };
  }

  if (!b.salary || typeof b.salary !== "object") {
    return { ok: false, error: "Salary structure details are required." };
  }

  const s = b.salary as Record<string, unknown>;
  const basic = Number(s.basic);
  const hra = Number(s.hra);
  const allowances = Number(s.allowances);
  const otherDeductions = Number(s.otherDeductions) || 0;
  const effectiveDate = typeof s.effectiveDate === "string" && s.effectiveDate.trim() ? s.effectiveDate.trim() : new Date().toISOString().slice(0, 10);

  if (isNaN(basic) || basic < 0) return { ok: false, error: "Valid basic salary is required." };
  if (isNaN(hra) || hra < 0) return { ok: false, error: "Valid HRA amount is required." };
  if (isNaN(allowances) || allowances < 0) return { ok: false, error: "Valid allowances amount is required." };

  return {
    ok: true,
    data: {
      employeeId: b.employeeId.trim(),
      salary: {
        basic,
        hra,
        allowances,
        otherDeductions,
        effectiveDate,
      },
    },
  };
}

