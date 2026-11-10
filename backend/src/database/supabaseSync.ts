import { isSupabaseConfigured, supabase } from "./supabase";
import type { DB, Employee, Task, LeaveRequest } from "./types";

/**
 * Loads the application state from Supabase if configured.
 * Returns null if Supabase is not configured or if an error occurs.
 */
export async function loadFromSupabase(fallbackDB: DB): Promise<DB | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const [
      { data: depts },
      { data: emps },
      { data: leaves },
      { data: projects },
      { data: boards },
      { data: columns },
      { data: tasks },
      { data: assignees },
      { data: expenses },
      { data: notifications },
    ] = await Promise.all([
      supabase.from("departments").select("*"),
      supabase.from("employees").select("*"),
      supabase.from("leaves").select("*"),
      supabase.from("projects").select("*"),
      supabase.from("boards").select("*"),
      supabase.from("board_columns").select("*"),
      supabase.from("tasks").select("*"),
      supabase.from("task_assignees").select("*"),
      supabase.from("expenses").select("*"),
      supabase.from("notifications").select("*"),
    ]);

    if (!emps || emps.length === 0) {
      console.warn("Supabase connected but tables are empty. Did you run supabase_schema.sql?");
      return null;
    }

    const draft = structuredClone(fallbackDB);

    if (depts && depts.length > 0) {
      draft.departments = depts.map((d: any) => ({
        id: d.id,
        name: d.name,
        code: d.code,
        headId: d.head_id,
        color: d.color || "blue",
      }));
    }

    if (emps && emps.length > 0) {
      draft.employees = emps.map((e: any) => ({
        id: e.id,
        code: e.code,
        firstName: e.first_name,
        lastName: e.last_name,
        email: e.email,
        password: e.password_hash || "demo1234",
        phone: e.phone || "",
        role: e.role,
        accountStatus: e.account_status || "ACTIVE",
        designation: e.designation,
        departmentId: e.department_id,
        managerId: e.manager_id,
        buddyId: e.buddy_id,
        joiningDate: e.joining_date,
        status: e.status || "ACTIVE",
        location: e.location || "HQ - Mumbai",
        workMode: e.work_mode || "Hybrid",
        shift: e.shift || "General (9:00 AM - 6:00 PM)",
        dob: e.dob || "1995-01-01",
        gender: e.gender || "Other",
        address: e.address || "",
        emergencyContact: e.emergency_contact || { name: "", relation: "", phone: "" },
        skills: e.skills || [],
        certifications: e.certifications || [],
        documents: [],
        assets: [],
        salary: e.salary || { basic: 50000, hra: 20000, allowances: 10000, otherDeductions: 2000, effectiveDate: "2026-01-01" },
        bankAccount: e.bank_account || "",
        pan: e.pan || "",
      }));
    }

    if (tasks && tasks.length > 0) {
      draft.tasks = tasks.map((t: any) => {
        const taskAssignees = (assignees || [])
          .filter((a: any) => a.task_id === t.id)
          .map((a: any) => a.employee_id);

        return {
          id: t.id,
          boardId: t.board_id,
          columnId: t.column_id,
          title: t.title,
          description: t.description || "",
          priority: t.priority || "MEDIUM",
          dueDate: t.due_date,
          assigneeIds: taskAssignees,
          creatorId: t.creator_id || "",
          flag: t.flag || "NORMAL",
          recurrence: t.recurrence || "NONE",
          tags: t.tags || [],
          comments: t.comments || [],
          attachments: t.attachments || [],
          createdAt: t.created_at || new Date().toISOString(),
          completedAt: t.completed_at,
          order: t.order_index || 0,
        };
      });
    }

    if (leaves && leaves.length > 0) {
      draft.leaves = leaves.map((l: any) => ({
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
      }));
    }

    console.log("Successfully connected and synced with Supabase!");
    return draft;
  } catch (err) {
    console.error("Error loading data from Supabase:", err);
    return null;
  }
}

/**
 * Sync single entity operations to Supabase
 */
export async function syncEmployeeToSupabase(emp: Employee) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from("employees").upsert({
      id: emp.id,
      code: emp.code,
      first_name: emp.firstName,
      last_name: emp.lastName,
      email: emp.email,
      password_hash: emp.password,
      phone: emp.phone,
      role: emp.role,
      account_status: emp.accountStatus,
      designation: emp.designation,
      department_id: emp.departmentId,
      manager_id: emp.managerId,
      joining_date: emp.joiningDate,
      status: emp.status,
      location: emp.location,
      work_mode: emp.workMode,
      salary: emp.salary,
    });
  } catch (e) {
    console.error("Supabase syncEmployee error:", e);
  }
}

export async function syncTaskToSupabase(task: Task) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from("tasks").upsert({
      id: task.id,
      board_id: task.boardId,
      column_id: task.columnId,
      title: task.title,
      description: task.description,
      priority: task.priority,
      due_date: task.dueDate,
      creator_id: task.creatorId,
      flag: task.flag,
      order_index: task.order,
    });

    if (task.assigneeIds && task.assigneeIds.length > 0) {
      const rows = task.assigneeIds.map((employee_id) => ({
        task_id: task.id,
        employee_id,
      }));
      await supabase.from("task_assignees").upsert(rows);
    }
  } catch (e) {
    console.error("Supabase syncTask error:", e);
  }
}

export async function syncLeaveDecisionToSupabase(leaveId: string, status: "APPROVED" | "REJECTED", comment?: string) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from("leaves").update({
      status,
      decision_comment: comment,
      decided_at: new Date().toISOString(),
    }).eq("id", leaveId);
  } catch (e) {
    console.error("Supabase syncLeave error:", e);
  }
}

