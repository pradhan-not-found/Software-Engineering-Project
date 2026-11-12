// frontend/src/lib/validations/team.schema.ts
// Layer 1: Validation Schemas for Page 16 (My Team & Department Collaboration Hub)

export interface TeamFilterInput {
  date?: string;
  includeIndirect?: boolean;
}

export interface ReassignTaskInput {
  taskId: string;
  fromEmployeeId: string;
  toEmployeeId: string;
}

export function validateTeamFilterInput(input: any): { ok: true; data: TeamFilterInput } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: true, data: { includeIndirect: true } };
  }

  const result: TeamFilterInput = {};

  if (input.date !== undefined && input.date !== null && input.date !== "") {
    const d = String(input.date).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      return { ok: false, error: "Date must be formatted YYYY-MM-DD." };
    }
    result.date = d;
  }

  result.includeIndirect = Boolean(input.includeIndirect ?? true);
  return { ok: true, data: result };
}

export function validateReassignTaskInput(input: any): { ok: true; data: ReassignTaskInput } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Reassignment payload is required." };
  }

  if (!input.taskId || typeof input.taskId !== "string" || !input.taskId.trim()) {
    return { ok: false, error: "Task ID is required." };
  }

  if (!input.fromEmployeeId || typeof input.fromEmployeeId !== "string" || !input.fromEmployeeId.trim()) {
    return { ok: false, error: "Current assignee ID is required." };
  }

  if (!input.toEmployeeId || typeof input.toEmployeeId !== "string" || !input.toEmployeeId.trim()) {
    return { ok: false, error: "Target assignee ID is required." };
  }

  if (input.fromEmployeeId.trim() === input.toEmployeeId.trim()) {
    return { ok: false, error: "Cannot reassign task to the same employee." };
  }

  return {
    ok: true,
    data: {
      taskId: input.taskId.trim(),
      fromEmployeeId: input.fromEmployeeId.trim(),
      toEmployeeId: input.toEmployeeId.trim(),
    },
  };
}
