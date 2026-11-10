/**
 * Leave Management Data Access Layer (DAL)
 * Layer 4: Repository Layer
 */

import { supabase, isSupabaseConfigured } from "../supabase";
import type { LeaveRequest, LeaveStatus, LeaveTypeKey, Task } from "../types";
import { createSeed } from "../seed";

export interface DBLeaveRow {
  id: string;
  employee_id: string;
  type: LeaveTypeKey;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  approver_id: string | null;
  decision_comment: string | null;
  created_at: string;
  decided_at: string | null;
}

function mapRowToLeave(row: DBLeaveRow): LeaveRequest {
  return {
    id: row.id,
    employeeId: row.employee_id,
    type: row.type,
    startDate: row.start_date,
    endDate: row.end_date,
    days: row.days,
    reason: row.reason,
    status: row.status,
    approverId: row.approver_id,
    decisionComment: row.decision_comment || undefined,
    createdAt: row.created_at,
    decidedAt: row.decided_at || undefined,
  };
}

export class LeaveRepository {
  /**
   * List leave requests with optional filters
   */
  async findAll(filters?: { employeeId?: string; status?: string }): Promise<LeaveRequest[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from("leaves").select("*");

        if (filters?.employeeId) {
          query = query.eq("employee_id", filters.employeeId);
        }
        if (filters?.status && filters.status !== "all") {
          query = query.eq("status", filters.status);
        }

        const { data, error } = await query.order("start_date", { ascending: false });

        if (!error && data) {
          return data.map((r) => mapRowToLeave(r as DBLeaveRow));
        }
      } catch (err) {
        console.error("Supabase findAll leaves error:", err);
      }
    }

    // Fallback to local in-memory seed
    const seed = createSeed();
    let list = seed.leaves;
    if (filters?.employeeId) {
      list = list.filter((l) => l.employeeId === filters.employeeId);
    }
    if (filters?.status && filters.status !== "all") {
      list = list.filter((l) => l.status === filters.status);
    }
    return list;
  }

  /**
   * Find leave request by ID
   */
  async findById(id: string): Promise<LeaveRequest | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from("leaves").select("*").eq("id", id).maybeSingle();
        if (!error && data) return mapRowToLeave(data as DBLeaveRow);
      } catch (err) {
        console.error("Supabase findById leave error:", err);
      }
    }

    const seed = createSeed();
    return seed.leaves.find((l) => l.id === id) || null;
  }

  /**
   * Submit new leave request
   */
  async create(leave: LeaveRequest): Promise<LeaveRequest> {
    if (isSupabaseConfigured && supabase) {
      try {
        const row: DBLeaveRow = {
          id: leave.id,
          employee_id: leave.employeeId,
          type: leave.type,
          start_date: leave.startDate,
          end_date: leave.endDate,
          days: leave.days,
          reason: leave.reason,
          status: leave.status,
          approver_id: leave.approverId,
          decision_comment: leave.decisionComment || null,
          created_at: leave.createdAt,
          decided_at: null,
        };

        await supabase.from("leaves").insert(row);
      } catch (err) {
        console.error("Supabase create leave error:", err);
      }
    }
    return leave;
  }

  /**
   * Record decision (APPROVE / REJECT)
   */
  async updateDecision(
    id: string,
    status: "APPROVED" | "REJECTED",
    approverId: string,
    comment?: string
  ): Promise<LeaveRequest | null> {
    const decidedAt = new Date().toISOString();

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from("leaves")
          .update({
            status,
            approver_id: approverId,
            decision_comment: comment || null,
            decided_at: decidedAt,
          })
          .eq("id", id);
      } catch (err) {
        console.error("Supabase updateDecision leave error:", err);
      }
    }

    const leave = await this.findById(id);
    if (leave) {
      leave.status = status;
      leave.approverId = approverId;
      leave.decisionComment = comment;
      leave.decidedAt = decidedAt;
    }
    return leave;
  }

  /**
   * Cancel pending leave request
   */
  async cancel(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("leaves").update({ status: "CANCELLED" }).eq("id", id);
        return true;
      } catch (err) {
        console.error("Supabase cancel leave error:", err);
      }
    }
    return true;
  }

  /**
   * Connected Wedge #2: Flag active tasks as DELAYED_ON_LEAVE in database
   */
  async flagTasksDelayedOnLeave(employeeId: string, startDate: string, endDate: string, commentText: string): Promise<number> {
    if (!isSupabaseConfigured || !supabase) return 0;

    try {
      // 1. Get task IDs assigned to this employee
      const { data: assignments } = await supabase
        .from("task_assignees")
        .select("task_id")
        .eq("employee_id", employeeId);

      if (!assignments || assignments.length === 0) return 0;

      const taskIds = assignments.map((a: any) => a.task_id);

      // 2. Query open tasks whose due date overlaps
      const { data: affectedTasks } = await supabase
        .from("tasks")
        .select("*")
        .in("id", taskIds)
        .is("completed_at", null)
        .gte("due_date", startDate)
        .lte("due_date", endDate);

      if (!affectedTasks || affectedTasks.length === 0) return 0;

      // 3. Update flag to DELAYED_ON_LEAVE
      const affectedIds = affectedTasks.map((t: any) => t.id);
      await supabase
        .from("tasks")
        .update({ flag: "DELAYED_ON_LEAVE" })
        .in("id", affectedIds);

      return affectedIds.length;
    } catch (err) {
      console.error("Supabase flagTasksDelayedOnLeave error:", err);
      return 0;
    }
  }
}

export const leaveRepository = new LeaveRepository();
