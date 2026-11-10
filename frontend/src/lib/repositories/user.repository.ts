/**
 * User & Employee Data Access Layer (DAL)
 * Layer 4: Repository Layer
 */

import { supabase, isSupabaseConfigured } from "../supabase";
import type { Employee, Role, EmployeeStatus, AccountStatus } from "../types";
import { createSeed } from "../seed";

export interface DBEmployeeRow {
  id: string;
  code: string;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  phone: string | null;
  role: Role;
  account_status: AccountStatus;
  designation: string;
  department_id: string | null;
  manager_id: string | null;
  buddy_id: string | null;
  joining_date: string;
  status: EmployeeStatus;
  location: string | null;
  work_mode: "Onsite" | "Hybrid" | "Remote" | null;
  shift: string | null;
  dob: string | null;
  gender: "Male" | "Female" | "Other" | null;
  address: string | null;
  emergency_contact: any;
  skills: string[] | null;
  certifications: string[] | null;
  salary: any;
  bank_account: string | null;
  pan: string | null;
}

/**
 * Maps raw database row into domain Employee model
 */
function mapRowToEmployee(row: DBEmployeeRow): Employee {
  return {
    id: row.id,
    code: row.code,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    password: row.password_hash,
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

export class UserRepository {
  /**
   * Find employee by email (case-insensitive)
   */
  async findByEmail(email: string): Promise<Employee | null> {
    const normalized = email.trim().toLowerCase();

    // 1. Try Supabase if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("*")
          .ilike("email", normalized)
          .maybeSingle();

        if (error) {
          console.warn("Supabase query error in findByEmail:", error.message);
        } else if (data) {
          return mapRowToEmployee(data as DBEmployeeRow);
        }
      } catch (err) {
        console.error("Supabase connection error:", err);
      }
    }

    // 2. Fallback to local deterministic seed
    const seed = createSeed();
    const found = seed.employees.find((e) => e.email.toLowerCase() === normalized);
    return found || null;
  }

  /**
   * Find employee by unique ID
   */
  async findById(id: string): Promise<Employee | null> {
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
        console.error("Supabase findById error:", err);
      }
    }

    const seed = createSeed();
    return seed.employees.find((e) => e.id === id) || null;
  }

  /**
   * Create a new employee / workspace user
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
          joining_date: employee.joiningDate,
          status: employee.status,
          location: employee.location,
          work_mode: employee.workMode,
          salary: employee.salary,
        };

        const { data, error } = await supabase
          .from("employees")
          .insert(row)
          .select()
          .single();

        if (!error && data) {
          return mapRowToEmployee(data as DBEmployeeRow);
        }
      } catch (err) {
        console.error("Supabase create employee error:", err);
      }
    }

    return employee;
  }
}

export const userRepository = new UserRepository();
