// frontend/src/lib/validations/expense.schema.ts
// Validation schemas for Expense Claims & Reimbursements

export type ExpenseCategory = "Travel" | "Meals" | "Equipment" | "Internet" | "Training" | "Other";
export type ExpenseStatus = "PENDING" | "APPROVED" | "REJECTED" | "REIMBURSED";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Travel",
  "Meals",
  "Equipment",
  "Internet",
  "Training",
  "Other",
];

export interface ExpenseCreateInput {
  employeeId?: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string;
  receiptName?: string | null;
}

export interface ExpenseDecisionInput {
  status: "APPROVED" | "REJECTED";
  decisionComment?: string;
}

export function validateExpenseCreateInput(body: unknown): { ok: true; data: ExpenseCreateInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request payload." };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.category !== "string" || !EXPENSE_CATEGORIES.includes(b.category as ExpenseCategory)) {
    return {
      ok: false,
      error: `Invalid expense category. Must be one of: ${EXPENSE_CATEGORIES.join(", ")}.`,
    };
  }

  const amount = Number(b.amount);
  if (isNaN(amount) || amount <= 0) {
    return { ok: false, error: "Expense amount must be a positive number greater than 0." };
  }

  if (typeof b.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(b.date.trim())) {
    return { ok: false, error: "Expense date must be in YYYY-MM-DD format." };
  }

  if (typeof b.description !== "string" || b.description.trim().length < 3) {
    return { ok: false, error: "Description is required and must be at least 3 characters." };
  }

  const employeeId = typeof b.employeeId === "string" && b.employeeId.trim() ? b.employeeId.trim() : undefined;
  const receiptName = typeof b.receiptName === "string" && b.receiptName.trim() ? b.receiptName.trim() : null;

  return {
    ok: true,
    data: {
      employeeId,
      category: b.category as ExpenseCategory,
      amount: Math.round(amount * 100) / 100,
      date: b.date.trim(),
      description: b.description.trim(),
      receiptName,
    },
  };
}

export function validateExpenseDecisionInput(body: unknown): { ok: true; data: ExpenseDecisionInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request payload." };
  }

  const b = body as Record<string, unknown>;

  if (b.status !== "APPROVED" && b.status !== "REJECTED") {
    return { ok: false, error: "Decision status must be either 'APPROVED' or 'REJECTED'." };
  }

  const decisionComment = typeof b.decisionComment === "string" ? b.decisionComment.trim() : undefined;

  return {
    ok: true,
    data: {
      status: b.status,
      decisionComment,
    },
  };
}

