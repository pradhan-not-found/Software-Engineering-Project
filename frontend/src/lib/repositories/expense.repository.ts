/**
 * Expense Data Access Layer (DAL)
 * Layer 2: Repository Layer
 * Supports dual-mode persistence: Live Supabase PostgreSQL with local in-memory fallback
 */

import { supabase, isSupabaseConfigured } from "../supabase";
import type { Expense, ExpenseCategory, ExpenseStatus } from "../types";
import { createSeed } from "../seed";

export class ExpenseRepository {
  private fallbackExpenses: Expense[] = [];

  constructor() {
    this.fallbackExpenses = createSeed().expenses;
  }

  /**
   * Find all expense claims with optional filtering
   */
  async findAll(filter?: {
    employeeId?: string;
    status?: ExpenseStatus | "ALL";
    category?: ExpenseCategory | "ALL";
  }): Promise<Expense[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from("expenses").select("*");

        if (filter?.employeeId) {
          query = query.eq("employee_id", filter.employeeId);
        }
        if (filter?.status && filter.status !== "ALL") {
          query = query.eq("status", filter.status);
        }
        if (filter?.category && filter.category !== "ALL") {
          query = query.eq("category", filter.category);
        }

        const { data, error } = await query.order("date", { ascending: false });

        if (!error && data) {
          return data.map((x: any) => ({
            id: x.id,
            employeeId: x.employee_id,
            category: x.category as ExpenseCategory,
            amount: Number(x.amount),
            date: x.date,
            description: x.description || "",
            receiptName: x.receipt_name || null,
            status: x.status as ExpenseStatus,
            decidedBy: x.decided_by || undefined,
            createdAt: x.created_at,
          }));
        }
      } catch (err) {
        console.error("Supabase findAll expenses error:", err);
      }
    }

    // Local Fallback
    return this.fallbackExpenses.filter((x) => {
      if (filter?.employeeId && x.employeeId !== filter.employeeId) return false;
      if (filter?.status && filter.status !== "ALL" && x.status !== filter.status) return false;
      if (filter?.category && filter.category !== "ALL" && x.category !== filter.category) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Find single expense claim by ID
   */
  async findById(id: string): Promise<Expense | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("expenses")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (!error && data) {
          return {
            id: data.id,
            employeeId: data.employee_id,
            category: data.category as ExpenseCategory,
            amount: Number(data.amount),
            date: data.date,
            description: data.description || "",
            receiptName: data.receipt_name || null,
            status: data.status as ExpenseStatus,
            decidedBy: data.decided_by || undefined,
            createdAt: data.created_at,
          };
        }
      } catch (err) {
        console.error("Supabase findById expense error:", err);
      }
    }

    return this.fallbackExpenses.find((x) => x.id === id) || null;
  }

  /**
   * Create new expense claim
   */
  async create(expense: Expense): Promise<Expense> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from("expenses").insert({
          id: expense.id,
          employee_id: expense.employeeId,
          category: expense.category,
          amount: expense.amount,
          date: expense.date,
          description: expense.description,
          receipt_name: expense.receiptName,
          status: expense.status,
          decided_by: expense.decidedBy || null,
          created_at: expense.createdAt,
        });

        if (error) {
          console.error("Supabase create expense error:", error);
        }
      } catch (err) {
        console.error("Supabase create expense exception:", err);
      }
    }

    this.fallbackExpenses.unshift(expense);
    return expense;
  }

  /**
   * Update expense claim (e.g. approve, reject, or mark reimbursed)
   */
  async update(id: string, patch: Partial<Expense>): Promise<Expense | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const payload: Record<string, any> = {};
        if (patch.status !== undefined) payload.status = patch.status;
        if (patch.decidedBy !== undefined) payload.decided_by = patch.decidedBy;
        if (patch.amount !== undefined) payload.amount = patch.amount;
        if (patch.category !== undefined) payload.category = patch.category;
        if (patch.description !== undefined) payload.description = patch.description;
        if (patch.receiptName !== undefined) payload.receipt_name = patch.receiptName;

        const { error } = await supabase
          .from("expenses")
          .update(payload)
          .eq("id", id);

        if (error) {
          console.error("Supabase update expense error:", error);
        }
      } catch (err) {
        console.error("Supabase update expense exception:", err);
      }
    }

    const idx = this.fallbackExpenses.findIndex((x) => x.id === id);
    if (idx !== -1) {
      this.fallbackExpenses[idx] = { ...this.fallbackExpenses[idx], ...patch };
      return this.fallbackExpenses[idx];
    }
    return null;
  }

  /**
   * Delete expense claim
   */
  async delete(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from("expenses").delete().eq("id", id);
        if (error) {
          console.error("Supabase delete expense error:", error);
        }
      } catch (err) {
        console.error("Supabase delete expense exception:", err);
      }
    }

    const initialLen = this.fallbackExpenses.length;
    this.fallbackExpenses = this.fallbackExpenses.filter((x) => x.id !== id);
    return this.fallbackExpenses.length < initialLen;
  }
}

