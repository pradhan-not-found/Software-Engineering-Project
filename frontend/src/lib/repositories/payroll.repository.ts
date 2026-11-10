/**
 * Payroll Data Access Layer (DAL)
 * Layer 4: Repository Layer
 */

import { supabase, isSupabaseConfigured } from "../supabase";
import type { PayrollRun, SalaryStructure } from "../types";
import { createSeed } from "../seed";

export class PayrollRepository {
  /**
   * List all payroll runs
   */
  async findAll(): Promise<PayrollRun[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("payroll_runs")
          .select("*")
          .order("month", { ascending: false });

        if (!error && data) {
          return data.map((r: any) => ({
            id: r.id,
            month: r.month,
            status: r.status,
            lines: r.lines || [],
            expenseIds: r.expense_ids || [],
            createdAt: r.created_at,
            processedAt: r.processed_at || undefined,
            paidAt: r.paid_at || undefined,
          }));
        }
      } catch (err) {
        console.error("Supabase findAll payroll_runs error:", err);
      }
    }

    // In-memory demo fallback
    const seed = createSeed();
    return seed.payrollRuns.sort((a, b) => b.month.localeCompare(a.month));
  }

  /**
   * Find run by ID
   */
  async findById(id: string): Promise<PayrollRun | null> {
    const runs = await this.findAll();
    return runs.find((r) => r.id === id) || null;
  }

  /**
   * Find run by month YYYY-MM
   */
  async findByMonth(month: string): Promise<PayrollRun | null> {
    const runs = await this.findAll();
    return runs.find((r) => r.month === month) || null;
  }

  /**
   * Insert or update a payroll run
   */
  async save(run: PayrollRun): Promise<PayrollRun> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("payroll_runs").upsert({
          id: run.id,
          month: run.month,
          status: run.status,
          lines: run.lines,
          expense_ids: run.expenseIds,
          created_at: run.createdAt,
          processed_at: run.processedAt || null,
          paid_at: run.paidAt || null,
        });
      } catch (err) {
        console.error("Supabase save payroll_run error:", err);
      }
    }

    return run;
  }

  /**
   * Delete a payroll run (drafts only)
   */
  async delete(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from("payroll_runs").delete().eq("id", id);
        return !error;
      } catch (err) {
        console.error("Supabase delete payroll_run error:", err);
        return false;
      }
    }

    return true;
  }

  /**
   * Update employee salary structure
   */
  async updateSalary(employeeId: string, salary: SalaryStructure): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from("employees")
          .update({ salary })
          .eq("id", employeeId);
        return !error;
      } catch (err) {
        console.error("Supabase updateSalary error:", err);
        return false;
      }
    }

    return true;
  }
}
