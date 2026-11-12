// frontend/src/lib/validations/org-chart.schema.ts
// Layer 1: Validation Schemas for Page 14 (Organization Hierarchy & Org Chart)

export interface OrgChartFilterInput {
  departmentId?: string;
  query?: string;
  includeTerminated?: boolean;
}

export interface ReassignManagerInput {
  employeeId: string;
  managerId: string | null;
}

export function validateOrgChartFilter(input: any): { ok: true; data: OrgChartFilterInput } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: true, data: {} };
  }

  return {
    ok: true,
    data: {
      departmentId: typeof input.departmentId === "string" && input.departmentId.trim() ? input.departmentId.trim() : undefined,
      query: typeof input.query === "string" && input.query.trim() ? input.query.trim() : undefined,
      includeTerminated: Boolean(input.includeTerminated),
    },
  };
}

export function validateReassignManagerInput(input: any): { ok: true; data: ReassignManagerInput } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Request payload is required." };
  }

  if (!input.employeeId || typeof input.employeeId !== "string" || !input.employeeId.trim()) {
    return { ok: false, error: "Employee ID is required." };
  }

  const managerId = input.managerId === null || input.managerId === undefined || input.managerId === ""
    ? null
    : String(input.managerId).trim();

  if (managerId === input.employeeId.trim()) {
    return { ok: false, error: "An employee cannot be assigned as their own manager." };
  }

  return {
    ok: true,
    data: {
      employeeId: input.employeeId.trim(),
      managerId,
    },
  };
}
