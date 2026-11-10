/**
 * Employee & Directory Validation Schemas
 * Layer 2 / Validation Layer
 */

import type { Role, Employee, Asset } from "../types";

export interface NewHireDTO {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  designation: string;
  departmentId: string;
  managerId: string | null;
  buddyId: string | null;
  role: Role;
  joiningDate: string;
  workMode: Employee["workMode"];
  location: string;
  gender: Employee["gender"];
  basicSalary: number;
  assets: Asset["type"][];
}

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function validateNewHireInput(body: unknown): ValidationResult<NewHireDTO> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid JSON request payload." };
  }

  const b = body as Record<string, unknown>;

  const firstName = typeof b.firstName === "string" ? b.firstName.trim() : "";
  const lastName = typeof b.lastName === "string" ? b.lastName.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const designation = typeof b.designation === "string" ? b.designation.trim() : "";
  const basicSalary = typeof b.basicSalary === "number" ? b.basicSalary : Number(b.basicSalary);

  if (!firstName || !lastName) {
    return { ok: false, error: "Both first name and last name are required." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return { ok: false, error: "A valid corporate email address is required." };
  }

  if (!designation) {
    return { ok: false, error: "Designation / job title is required." };
  }

  if (isNaN(basicSalary) || basicSalary <= 0) {
    return { ok: false, error: "Basic monthly salary must be greater than zero." };
  }

  const validRoles: Role[] = ["SUPER_ADMIN", "HR_ADMIN", "MANAGER", "EMPLOYEE"];
  const role = validRoles.includes(b.role as Role) ? (b.role as Role) : "EMPLOYEE";

  const validWorkModes: Employee["workMode"][] = ["Onsite", "Hybrid", "Remote"];
  const workMode = validWorkModes.includes(b.workMode as Employee["workMode"])
    ? (b.workMode as Employee["workMode"])
    : "Hybrid";

  const validGenders: Employee["gender"][] = ["Male", "Female", "Other"];
  const gender = validGenders.includes(b.gender as Employee["gender"])
    ? (b.gender as Employee["gender"])
    : "Other";

  const joiningDate = typeof b.joiningDate === "string" && b.joiningDate
    ? b.joiningDate
    : new Date().toISOString().slice(0, 10);

  const assets = Array.isArray(b.assets) ? (b.assets as Asset["type"][]) : ["Laptop", "ID Card"];

  return {
    ok: true,
    data: {
      firstName,
      lastName,
      email,
      phone: typeof b.phone === "string" ? b.phone.trim() : "",
      designation,
      departmentId: typeof b.departmentId === "string" ? b.departmentId : "dept_eng",
      managerId: typeof b.managerId === "string" && b.managerId ? b.managerId : null,
      buddyId: typeof b.buddyId === "string" && b.buddyId ? b.buddyId : null,
      role,
      joiningDate,
      workMode,
      location: typeof b.location === "string" ? b.location.trim() : "HQ - Mumbai",
      gender,
      basicSalary,
      assets,
    },
  };
}

export function validateEmployeePatch(body: unknown): ValidationResult<Partial<Employee>> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid patch payload." };
  }

  const b = body as Record<string, unknown>;
  const patch: Partial<Employee> = {};

  if (typeof b.firstName === "string" && b.firstName.trim()) patch.firstName = b.firstName.trim();
  if (typeof b.lastName === "string" && b.lastName.trim()) patch.lastName = b.lastName.trim();
  if (typeof b.phone === "string") patch.phone = b.phone.trim();
  if (typeof b.designation === "string" && b.designation.trim()) patch.designation = b.designation.trim();
  if (typeof b.departmentId === "string" && b.departmentId) patch.departmentId = b.departmentId;
  if ("managerId" in b) patch.managerId = typeof b.managerId === "string" && b.managerId ? b.managerId : null;
  if ("buddyId" in b) patch.buddyId = typeof b.buddyId === "string" && b.buddyId ? b.buddyId : null;
  if (typeof b.location === "string") patch.location = b.location.trim();
  if (typeof b.status === "string") patch.status = b.status as Employee["status"];
  if (typeof b.accountStatus === "string") patch.accountStatus = b.accountStatus as Employee["accountStatus"];

  return { ok: true, data: patch };
}

