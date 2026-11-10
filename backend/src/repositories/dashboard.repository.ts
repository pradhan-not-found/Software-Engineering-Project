/**
 * Dashboard Data Access Layer (DAL)
 * Layer 4: Repository Layer
 */

import { supabase, isSupabaseConfigured } from "../supabase";
import type { DB, Employee, Attendance, LeaveRequest, Task, Expense, Timesheet, Department, ActivityItem } from "../types";
import { createSeed } from "../seed";

export class DashboardRepository {
  /**
   * Fetch complete executive operational data snapshot
   */
  async getSnapshot(date: string): Promise<{
    employees: Employee[];
    attendance: Attendance[];
    leaves: LeaveRequest[];
    tasks: Task[];
    expenses: Expense[];
    timesheets: Timesheet[];
    departments: Department[];
    activity: ActivityItem[];
  }> {
    if (isSupabaseConfigured && supabase) {
      try {
        const [
          { data: emps },
          { data: att },
          { data: leaves },
          { data: tasks },
          { data: expenses },
          { data: timesheets },
          { data: depts },
          { data: activity },
        ] = await Promise.all([
          supabase.from("employees").select("*"),
          supabase.from("attendance").select("*").eq("date", date),
          supabase.from("leaves").select("*"),
          supabase.from("tasks").select("*"),
          supabase.from("expenses").select("*"),
          supabase.from("timesheets").select("*"),
          supabase.from("departments").select("*"),
          supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(20),
        ]);

        if (emps && emps.length > 0) {
          return {
            employees: emps.map((e: any) => ({
              id: e.id,
              code: e.code,
              firstName: e.first_name,
              lastName: e.last_name,
              email: e.email,
              password: e.password_hash,
              phone: e.phone,
              role: e.role,
              accountStatus: e.account_status,
              designation: e.designation,
              departmentId: e.department_id,
              managerId: e.manager_id,
              buddyId: e.buddy_id,
              joiningDate: e.joining_date,
              status: e.status,
              location: e.location,
              workMode: e.work_mode,
              shift: e.shift,
              dob: e.dob,
              gender: e.gender,
              address: e.address,
              emergencyContact: e.emergency_contact || { name: "", relation: "", phone: "" },
              skills: e.skills || [],
              certifications: e.certifications || [],
              documents: [],
              assets: [],
              salary: e.salary || { basic: 50000, hra: 20000, allowances: 10000, otherDeductions: 0, effectiveDate: "2026-01-01" },
              bankAccount: e.bank_account || "",
              pan: e.pan || "",
            })),
            attendance: (att || []).map((a: any) => ({
              id: a.id,
              employeeId: a.employee_id,
              date: a.date,
              clockIn: a.clock_in,
              clockOut: a.clock_out,
              status: a.status,
            })),
            leaves: (leaves || []).map((l: any) => ({
              id: l.id,
              employeeId: l.employee_id,
              type: l.type,
              startDate: l.start_date,
              endDate: l.end_date,
              days: l.days,
              reason: l.reason,
              status: l.status,
              approverId: l.approver_id,
              decisionComment: l.decision_comment,
              createdAt: l.created_at,
              decidedAt: l.decided_at,
            })),
            tasks: (tasks || []).map((t: any) => ({
              id: t.id,
              boardId: t.board_id,
              columnId: t.column_id,
              title: t.title,
              description: t.description || "",
              priority: t.priority,
              dueDate: t.due_date,
              assigneeIds: [],
              creatorId: t.creator_id,
              flag: t.flag,
              recurrence: t.recurrence || "NONE",
              tags: t.tags || [],
              comments: t.comments || [],
              attachments: t.attachments || [],
              createdAt: t.created_at,
              completedAt: t.completed_at,
              order: t.order_index || 0,
            })),
            expenses: (expenses || []).map((x: any) => ({
              id: x.id,
              employeeId: x.employee_id,
              category: x.category,
              amount: x.amount,
              date: x.date,
              description: x.description,
              receiptName: x.receipt_name,
              status: x.status,
              createdAt: x.created_at,
            })),
            timesheets: (timesheets || []).map((ts: any) => ({
              id: ts.id,
              employeeId: ts.employee_id,
              weekStart: ts.week_start,
              entries: ts.entries || [],
              status: ts.status,
              submittedAt: ts.submitted_at,
              decidedBy: ts.decided_by,
            })),
            departments: (depts || []).map((d: any) => ({
              id: d.id,
              name: d.name,
              code: d.code,
              headId: d.head_id,
              color: d.color || "blue",
            })),
            activity: (activity || []).map((a: any) => ({
              id: a.id,
              actorId: a.actor_id,
              action: a.action,
              entity: a.entity,
              message: a.message,
              category: a.category,
              at: a.created_at,
            })),
          };
        }
      } catch (err) {
        console.error("Supabase getSnapshot error:", err);
      }
    }

    // In-memory demo fallback
    const seed = createSeed();
    return {
      employees: seed.employees,
      attendance: seed.attendance.filter((a) => a.date === date),
      leaves: seed.leaves,
      tasks: seed.tasks,
      expenses: seed.expenses,
      timesheets: seed.timesheets,
      departments: seed.departments,
      activity: seed.activity,
    };
  }
}
