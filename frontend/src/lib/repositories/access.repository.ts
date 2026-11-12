/**
 * Access Control & RBAC Data Access Layer (DAL)
 * Layer 2: Repository Layer
 */

import { supabase, isSupabaseConfigured } from "../supabase";
import type { Employee, Role, ModuleKey, AccountStatus, PermissionMatrix } from "../types";
import { createSeed, defaultPermissions } from "../seed";
import type { DBEmployeeRow } from "./user.repository";

let inMemoryPermissions: PermissionMatrix | null = null;
let inMemoryEmployees: Employee[] | null = null;

function getFallbackPermissions(): PermissionMatrix {
  if (!inMemoryPermissions) {
    inMemoryPermissions = defaultPermissions();
  }
  return inMemoryPermissions;
}

function getFallbackEmployees(): Employee[] {
  if (!inMemoryEmployees) {
    inMemoryEmployees = [...createSeed().employees];
  }
  return inMemoryEmployees;
}

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

export class AccessRepository {
  /**
   * Retrieve current permissions matrix
   */
  async getPermissions(): Promise<PermissionMatrix> {
    return JSON.parse(JSON.stringify(getFallbackPermissions()));
  }

  /**
   * Toggle or set a specific permission cell for a role
   */
  async updatePermission(
    role: Role,
    module: ModuleKey,
    enabled?: boolean
  ): Promise<{ permissions: PermissionMatrix; previous: boolean; current: boolean }> {
    const matrix = getFallbackPermissions();
    const previous = matrix[role][module] ?? false;
    const current = typeof enabled === "boolean" ? enabled : !previous;
    matrix[role][module] = current;

    return {
      permissions: JSON.parse(JSON.stringify(matrix)),
      previous,
      current,
    };
  }

  /**
   * Find employee by ID
   */
  async findEmployeeById(id: string): Promise<Employee | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (!error && data) {
          return mapRowToEmployee(data as DBEmployeeRow);
        }
      } catch (err) {
        console.error("Supabase findEmployeeById error in AccessRepository:", err);
      }
    }

    const emps = getFallbackEmployees();
    return emps.find((e) => e.id === id) || null;
  }

  /**
   * Update an employee's role
   */
  async setRole(employeeId: string, role: Role): Promise<{ employee: Employee; previousRole: Role }> {
    const target = await this.findEmployeeById(employeeId);
    if (!target) {
      throw new Error("Employee not found.");
    }
    const previousRole = target.role;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("employees")
          .update({ role })
          .eq("id", employeeId)
          .select()
          .single();

        if (!error && data) {
          return { employee: mapRowToEmployee(data as DBEmployeeRow), previousRole };
        }
      } catch (err) {
        console.error("Supabase setRole error in AccessRepository:", err);
      }
    }

    target.role = role;
    return { employee: target, previousRole };
  }

  /**
   * Update an employee's account status (ACTIVE | SUSPENDED)
   */
  async setAccountStatus(
    employeeId: string,
    status: AccountStatus
  ): Promise<{ employee: Employee; previousStatus: AccountStatus }> {
    const target = await this.findEmployeeById(employeeId);
    if (!target) {
      throw new Error("Employee not found.");
    }
    const previousStatus = target.accountStatus;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("employees")
          .update({ account_status: status })
          .eq("id", employeeId)
          .select()
          .single();

        if (!error && data) {
          return { employee: mapRowToEmployee(data as DBEmployeeRow), previousStatus };
        }
      } catch (err) {
        console.error("Supabase setAccountStatus error in AccessRepository:", err);
      }
    }

    target.accountStatus = status;
    return { employee: target, previousStatus };
  }

  /**
   * Reset an employee's password to default or custom
   */
  async resetPassword(employeeId: string, newPassword = "demo1234"): Promise<{ employee: Employee }> {
    const target = await this.findEmployeeById(employeeId);
    if (!target) {
      throw new Error("Employee not found.");
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("employees")
          .update({ password_hash: newPassword })
          .eq("id", employeeId)
          .select()
          .single();

        if (!error && data) {
          return { employee: mapRowToEmployee(data as DBEmployeeRow) };
        }
      } catch (err) {
        console.error("Supabase resetPassword error in AccessRepository:", err);
      }
    }

    target.password = newPassword;
    return { employee: target };
  }

  /**
   * Count employees per role
   */
  async getRoleCounts(): Promise<Record<Role, number>> {
    const counts: Record<Role, number> = {
      SUPER_ADMIN: 0,
      HR_ADMIN: 0,
      MANAGER: 0,
      EMPLOYEE: 0,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("role, status")
          .neq("status", "TERMINATED");

        if (!error && data) {
          data.forEach((r) => {
            const role = r.role as Role;
            if (role in counts) counts[role]++;
          });
          return counts;
        }
      } catch (err) {
        console.error("Supabase getRoleCounts error:", err);
      }
    }

    const emps = getFallbackEmployees().filter((e) => e.status !== "TERMINATED");
    emps.forEach((e) => {
      if (e.role in counts) counts[e.role]++;
    });
    return counts;
  }

  /**
   * Total active or total count of Super Admins
   */
  async findSuperAdminCount(): Promise<number> {
    const counts = await this.getRoleCounts();
    return counts.SUPER_ADMIN;
  }

  /**
   * Total count of active (non-suspended) Super Admins
   */
  async findActiveSuperAdminCount(): Promise<number> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { count, error } = await supabase
          .from("employees")
          .select("id", { count: "exact", head: true })
          .eq("role", "SUPER_ADMIN")
          .eq("account_status", "ACTIVE")
          .neq("status", "TERMINATED");

        if (!error && count !== null) {
          return count;
        }
      } catch (err) {
        console.error("Supabase findActiveSuperAdminCount error:", err);
      }
    }

    return getFallbackEmployees().filter(
      (e) => e.role === "SUPER_ADMIN" && e.accountStatus === "ACTIVE" && e.status !== "TERMINATED"
    ).length;
  }

  /**
   * Get all users for access administration
   */
  async getUsers(filter?: { role?: Role | "all"; search?: string }): Promise<Employee[]> {
    let emps = isSupabaseConfigured && supabase
      ? await (async () => {
          try {
            let q = supabase.from("employees").select("*");
            if (filter?.role && filter.role !== "all") {
              q = q.eq("role", filter.role);
            }
            const { data, error } = await q;
            if (!error && data) return data.map((r) => mapRowToEmployee(r as DBEmployeeRow));
          } catch {}
          return getFallbackEmployees();
        })()
      : getFallbackEmployees();

    emps = emps.filter((e) => e.status !== "TERMINATED" || e.accountStatus === "ACTIVE");

    if (filter?.role && filter.role !== "all") {
      emps = emps.filter((e) => e.role === filter.role);
    }

    if (filter?.search) {
      const s = filter.search.toLowerCase().trim();
      emps = emps.filter((e) => `${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(s));
    }

    return emps;
  }
}

export const accessRepository = new AccessRepository();
