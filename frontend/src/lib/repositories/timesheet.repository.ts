/**
 * Timesheets Data Access Layer (DAL)
 * Layer 4: Repository Layer
 */

import { supabase, isSupabaseConfigured } from "../supabase";
import type { Timesheet, TimesheetStatus } from "../types";
import { createSeed } from "../seed";

export class TimesheetRepository {
  /**
   * List timesheets with optional filtering
   */
  async findAll(filter?: { employeeId?: string; status?: TimesheetStatus; weekStart?: string }): Promise<Timesheet[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from("timesheets").select("*");

        if (filter?.employeeId) {
          query = query.eq("employee_id", filter.employeeId);
        }
        if (filter?.status) {
          query = query.eq("status", filter.status);
        }
        if (filter?.weekStart) {
          query = query.eq("week_start", filter.weekStart);
        }

        const { data, error } = await query.order("week_start", { ascending: false });

        if (!error && data) {
          return data.map((t: any) => ({
            id: t.id,
            employeeId: t.employee_id,
            weekStart: t.week_start,
            entries: t.entries || [],
            status: t.status as TimesheetStatus,
            submittedAt: t.submitted_at || undefined,
            decidedBy: t.decided_by || undefined,
          }));
        }
      } catch (err) {
        console.error("Supabase findAll timesheets error:", err);
      }
    }

    // Fallback to local in-memory seed
    const seed = createSeed();
    let list = seed.timesheets;

    if (filter?.employeeId) {
      list = list.filter((t) => t.employeeId === filter.employeeId);
    }
    if (filter?.status) {
      list = list.filter((t) => t.status === filter.status);
    }
    if (filter?.weekStart) {
      list = list.filter((t) => t.weekStart === filter.weekStart);
    }

    return list;
  }

  /**
   * Find timesheet by ID
   */
  async findById(id: string): Promise<Timesheet | null> {
    const list = await this.findAll();
    return list.find((t) => t.id === id) || null;
  }

  /**
   * Find timesheet by employee and weekStart
   */
  async findByWeek(employeeId: string, weekStart: string): Promise<Timesheet | null> {
    const list = await this.findAll({ employeeId, weekStart });
    return list[0] || null;
  }

  /**
   * Insert or update a timesheet
   */
  async save(timesheet: Timesheet): Promise<Timesheet> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("timesheets").upsert({
          id: timesheet.id,
          employee_id: timesheet.employeeId,
          week_start: timesheet.weekStart,
          entries: timesheet.entries,
          status: timesheet.status,
          submitted_at: timesheet.submittedAt,
          decided_by: timesheet.decidedBy,
        });
      } catch (err) {
        console.error("Supabase save timesheet error:", err);
      }
    }

    return timesheet;
  }

  /**
   * Decide timesheet approval or rejection
   */
  async decide(id: string, status: TimesheetStatus, decidedBy: string): Promise<Timesheet | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("timesheets")
          .update({
            status,
            decided_by: decidedBy,
          })
          .eq("id", id)
          .select("*")
          .single();

        if (!error && data) {
          return {
            id: data.id,
            employeeId: data.employee_id,
            weekStart: data.week_start,
            entries: data.entries || [],
            status: data.status as TimesheetStatus,
            submittedAt: data.submitted_at,
            decidedBy: data.decided_by,
          };
        }
      } catch (err) {
        console.error("Supabase decide timesheet error:", err);
      }
    }

    const ts = await this.findById(id);
    if (!ts) return null;
    ts.status = status;
    ts.decidedBy = decidedBy;
    return ts;
  }
}
