/**
 * Expense Domain Service
 * Layer 3: Domain Service Layer
 * Business Logic: Expense submission, validation, manager/admin decision workflow,
 * Connected Wedge linking to Payroll reimbursable allowances, and financial audit integrity.
 */

import { ExpenseRepository } from "../repositories/expense.repository";
import type { Employee, Expense, ExpenseCategory, ExpenseStatus } from "../types";
import { isAdminRole, uid, today } from "../utils";
import type { ExpenseCreateInput, ExpenseDecisionInput } from "../validations/expense.schema";

export class ExpenseService {
  private expenseRepo: ExpenseRepository;

  constructor(expenseRepo = new ExpenseRepository()) {
    this.expenseRepo = expenseRepo;
  }

  /**
   * List expense claims based on actor permissions
   */
  async listExpenses(
    actor: Employee,
    filter?: {
      employeeId?: string;
      status?: ExpenseStatus | "ALL";
      category?: ExpenseCategory | "ALL";
    }
  ): Promise<Expense[]> {
    // Non-admins can only view their own expense claims
    const effectiveEmployeeId = isAdminRole(actor.role)
      ? filter?.employeeId
      : actor.id;

    return this.expenseRepo.findAll({
      ...filter,
      employeeId: effectiveEmployeeId,
    });
  }

  /**
   * Get single expense claim
   */
  async getExpenseById(
    id: string,
    actor: Employee
  ): Promise<{ ok: true; data: Expense } | { ok: false; error: string }> {
    const expense = await this.expenseRepo.findById(id);
    if (!expense) {
      return { ok: false, error: "Expense claim not found." };
    }

    if (!isAdminRole(actor.role) && expense.employeeId !== actor.id) {
      return { ok: false, error: "You are not authorized to view this expense claim." };
    }

    return { ok: true, data: expense };
  }

  /**
   * Submit new expense claim
   */
  async submitExpense(
    input: ExpenseCreateInput,
    actor: Employee
  ): Promise<{ ok: true; data: Expense } | { ok: false; error: string }> {
    // Target employee: actor submits for self, unless admin explicitly targets another employee
    const targetEmployeeId = isAdminRole(actor.role) && input.employeeId
      ? input.employeeId
      : actor.id;

    const newExpense: Expense = {
      id: uid("exp"),
      employeeId: targetEmployeeId,
      category: input.category,
      amount: input.amount,
      date: input.date || today(),
      description: input.description,
      receiptName: input.receiptName || null,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };

    const saved = await this.expenseRepo.create(newExpense);
    return { ok: true, data: saved };
  }

  /**
   * Decide on expense claim (Approve or Reject)
   * Connected Wedge: Approved claims will be bundled into the employee's next payroll reimbursement line!
   */
  async decideExpense(
    id: string,
    input: ExpenseDecisionInput,
    actor: Employee
  ): Promise<{ ok: true; data: Expense } | { ok: false; error: string }> {
    if (!isAdminRole(actor.role)) {
      return { ok: false, error: "Only administrators can approve or reject expense claims." };
    }

    const existing = await this.expenseRepo.findById(id);
    if (!existing) {
      return { ok: false, error: "Expense claim not found." };
    }

    if (existing.status !== "PENDING") {
      return {
        ok: false,
        error: `Cannot decide on an expense that is already ${existing.status.toLowerCase()}.`,
      };
    }

    const updated = await this.expenseRepo.update(id, {
      status: input.status,
      decidedBy: actor.id,
    });

    if (!updated) {
      return { ok: false, error: "Failed to update expense status." };
    }

    return { ok: true, data: updated };
  }

  /**
   * Delete expense claim with financial audit protection
   */
  async deleteExpense(
    id: string,
    actor: Employee
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const existing = await this.expenseRepo.findById(id);
    if (!existing) {
      return { ok: false, error: "Expense claim not found." };
    }

    // Protection: Approved or Reimbursed claims cannot be deleted
    if (existing.status === "APPROVED" || existing.status === "REIMBURSED") {
      return {
        ok: false,
        error: `Cannot delete an expense claim that is already ${existing.status.toLowerCase()}. Financial audit rules apply.`,
      };
    }

    // Permission check
    if (!isAdminRole(actor.role) && existing.employeeId !== actor.id) {
      return { ok: false, error: "You can only delete your own pending expense claims." };
    }

    const success = await this.expenseRepo.delete(id);
    if (!success) {
      return { ok: false, error: "Failed to delete expense claim." };
    }

    return { ok: true };
  }

  /**
   * Connected Wedge: Query pending approved reimbursements for an employee for payroll aggregation
   */
  async getApprovedReimbursementsForEmployee(employeeId: string): Promise<number> {
    const approvedExpenses = await this.expenseRepo.findAll({
      employeeId,
      status: "APPROVED",
    });

    return approvedExpenses.reduce((sum, item) => sum + item.amount, 0);
  }
}

