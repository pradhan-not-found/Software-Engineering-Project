/**
 * Attendance Data Access Layer (DAL)
 * Layer 4: Repository Layer
 */

import { supabase, isSupabaseConfigured } from "../supabase";
import type { Attendance, AttendanceStatus } from "../types";
import { createSeed } from "../seed";

export class AttendanceRepository {
  /**
   * Find attendance records matching filter criteria
   */
  async findAll(filter?: { date?: string; employeeId?: string; month?: string }): Promise<Attendance[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from("attendance").select("*");

        if (filter?.date) {
          query = query.eq("date", filter.date);
        }
        if (filter?.employeeId) {
          query = query.eq("employee_id", filter.employeeId);
        }
        if (filter?.month) {
          const startDate = `${filter.month}-01`;
          const endDate = `${filter.month}-31`;
          query = query.gte("date", startDate).lte("date", endDate);
        }

        const { data, error } = await query.order("date", { ascending: false });

        if (!error && data) {
          return data.map((r: any) => ({
            id: r.id,
            employeeId: r.employee_id,
            date: r.date,
            clockIn: r.clock_in,
            clockOut: r.clock_out,
            status: r.status as AttendanceStatus,
          }));
        }
      } catch (err) {
        console.error("Supabase findAll attendance error:", err);
      }
    }

    // Fallback to local in-memory seed
    const seed = createSeed();
    let list = seed.attendance;

    if (filter?.date) {
      list = list.filter((a) => a.date === filter.date);
    }
    if (filter?.employeeId) {
      list = list.filter((a) => a.employeeId === filter.employeeId);
    }
    if (filter?.month) {
      list = list.filter((a) => a.date.startsWith(filter.month!));
    }

    return list;
  }

  /**
   * Find single record for an employee on a given date
   */
  async findRecord(employeeId: string, date: string): Promise<Attendance | null> {
    const records = await this.findAll({ employeeId, date });
    return records[0] || null;
  }

  /**
   * Insert or update an attendance record
   */
  async saveRecord(record: Attendance): Promise<Attendance> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("attendance").upsert({
          id: record.id,
          employee_id: record.employeeId,
          date: record.date,
          clock_in: record.clockIn,
          clock_out: record.clockOut,
          status: record.status,
        });
      } catch (err) {
        console.error("Supabase saveRecord attendance error:", err);
      }
    }

    return record;
  }

  /**
   * Update shift on employee record
   */
  async setShift(employeeId: string, shift: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from("employees")
          .update({ shift })
          .eq("id", employeeId);
        return !error;
      } catch (err) {
        console.error("Supabase setShift error:", err);
        return false;
      }
    }
    return true;
  }
}
