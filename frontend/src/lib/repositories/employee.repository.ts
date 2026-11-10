/**
 * Employee Data Access Layer (DAL)
 * Layer 4: Repository Layer
 */

import { supabase, isSupabaseConfigured } from "../supabase";
import type { Employee, Board, BoardColumn, Task } from "../types";
import { createSeed } from "../seed";
import type { DBEmployeeRow } from "./user.repository";

function mapRowToEmployee(row: DBEmployeeRow): Employee {
  return {
    id: row.id,
    code: row.code,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    password: row.password_hash || "demo1234",
    phone: row.phone || "",
    role: row.role,
    accountStatus: row.account_status,
    designation: row.designation,
    departmentId: row.department_id || "",
    managerId: row.manager_id,
    buddyId: row.buddy_id,
    joiningDate: row.joining_date,
    status: row.status,
    location: row.location || "HQ - Mumbai",
    workMode: row.work_mode || "Hybrid",
    shift: row.shift || "General (09:00 – 18:00)",
    dob: row.dob || "1995-01-01",
    gender: row.gender || "Other",
    address: row.address || "",
    emergencyContact: row.emergency_contact || { name: "", relation: "", phone: "" },
    skills: row.skills || [],
    certifications: row.certifications || [],
    documents: [],
    assets: [],
    salary: row.salary || { basic: 50000, hra: 20000, allowances: 10000, otherDeductions: 0, effectiveDate: row.joining_date },
    bankAccount: row.bank_account || "",
    pan: row.pan || "",
  };
}

export class EmployeeRepository {
  /**
   * List all employees with optional filters
   */
  async findAll(filters?: { departmentId?: string; status?: string; search?: string }): Promise<Employee[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from("employees").select("*");

        if (filters?.departmentId && filters.departmentId !== "all") {
          query = query.eq("department_id", filters.departmentId);
        }
        if (filters?.status && filters.status !== "all") {
          query = query.eq("status", filters.status);
        }

        const { data, error } = await query.order("joining_date", { ascending: false });

        if (!error && data) {
          let list = data.map((r) => mapRowToEmployee(r as DBEmployeeRow));
          if (filters?.search) {
            const s = filters.search.toLowerCase().trim();
            list = list.filter((e) =>
              `${e.firstName} ${e.lastName} ${e.email} ${e.designation} ${e.code}`.toLowerCase().includes(s)
            );
          }
          return list;
        }
      } catch (err) {
        console.error("Supabase findAll employees error:", err);
      }
    }

    // Fallback to in-memory seed
    const seed = createSeed();
    let emps = seed.employees;
    if (filters?.departmentId && filters.departmentId !== "all") {
      emps = emps.filter((e) => e.departmentId === filters.departmentId);
    }
    if (filters?.status && filters.status !== "all") {
      emps = emps.filter((e) => e.status === filters.status);
    }
    if (filters?.search) {
      const s = filters.search.toLowerCase().trim();
      emps = emps.filter((e) =>
        `${e.firstName} ${e.lastName} ${e.email} ${e.designation} ${e.code}`.toLowerCase().includes(s)
      );
    }
    return emps;
  }

  /**
   * Find employee by ID
   */
  async findById(id: string): Promise<Employee | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from("employees").select("*").eq("id", id).maybeSingle();
        if (!error && data) return mapRowToEmployee(data as DBEmployeeRow);
      } catch (err) {
        console.error("Supabase findById error:", err);
      }
    }

    const seed = createSeed();
    return seed.employees.find((e) => e.id === id) || null;
  }

  /**
   * Save new employee record
   */
  async create(employee: Employee): Promise<Employee> {
    if (isSupabaseConfigured && supabase) {
      try {
        const row: Partial<DBEmployeeRow> = {
          id: employee.id,
          code: employee.code,
          first_name: employee.firstName,
          last_name: employee.lastName,
          email: employee.email,
          password_hash: employee.password,
          phone: employee.phone,
          role: employee.role,
          account_status: employee.accountStatus,
          designation: employee.designation,
          department_id: employee.departmentId || null,
          manager_id: employee.managerId,
          buddy_id: employee.buddyId,
          joining_date: employee.joiningDate,
          status: employee.status,
          location: employee.location,
          work_mode: employee.workMode,
          salary: employee.salary,
        };

        await supabase.from("employees").insert(row);
      } catch (err) {
        console.error("Supabase create employee error:", err);
      }
    }
    return employee;
  }

  /**
   * Update employee record
   */
  async update(id: string, patch: Partial<Employee>): Promise<Employee | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const row: Record<string, any> = {};
        if (patch.firstName) row.first_name = patch.firstName;
        if (patch.lastName) row.last_name = patch.lastName;
        if (patch.phone !== undefined) row.phone = patch.phone;
        if (patch.designation) row.designation = patch.designation;
        if (patch.departmentId) row.department_id = patch.departmentId;
        if (patch.managerId !== undefined) row.manager_id = patch.managerId;
        if (patch.buddyId !== undefined) row.buddy_id = patch.buddyId;
        if (patch.location) row.location = patch.location;
        if (patch.status) row.status = patch.status;
        if (patch.accountStatus) row.account_status = patch.accountStatus;

        await supabase.from("employees").update(row).eq("id", id);
      } catch (err) {
        console.error("Supabase update employee error:", err);
      }
    }
    return this.findById(id);
  }

  /**
   * Connected Wedge: Persist Onboarding Board and starter tasks to Supabase
   */
  async saveOnboardingBoard(board: Board, columns: BoardColumn[], tasks: Task[]): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;

    try {
      // 1. Insert Board
      await supabase.from("boards").upsert({
        id: board.id,
        title: board.title,
        type: board.type,
        project_id: board.projectId,
        owner_id: board.ownerId,
      });

      // 2. Insert Columns
      const colRows = columns.map((col, index) => ({
        id: col.id,
        board_id: board.id,
        name: col.name,
        category: col.category,
        order_index: index,
      }));
      await supabase.from("board_columns").upsert(colRows);

      // 3. Insert Tasks
      const taskRows = tasks.map((t, index) => ({
        id: t.id,
        board_id: t.boardId,
        column_id: t.columnId,
        title: t.title,
        description: t.description,
        priority: t.priority,
        due_date: t.dueDate,
        creator_id: t.creatorId,
        flag: t.flag,
        order_index: index,
      }));
      await supabase.from("tasks").upsert(taskRows);

      // 4. Insert Task Assignees
      const assigneeRows: { task_id: string; employee_id: string }[] = [];
      for (const t of tasks) {
        for (const empId of t.assigneeIds) {
          assigneeRows.push({ task_id: t.id, employee_id: empId });
        }
      }
      if (assigneeRows.length > 0) {
        await supabase.from("task_assignees").upsert(assigneeRows);
      }
    } catch (err) {
      console.error("Supabase saveOnboardingBoard error:", err);
    }
  }
}

export const employeeRepository = new EmployeeRepository();

