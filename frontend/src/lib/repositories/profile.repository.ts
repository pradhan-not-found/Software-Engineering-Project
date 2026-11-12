// frontend/src/lib/repositories/profile.repository.ts
// Layer 2: Repository Data Access for Employee Profile & Self-Service

import { createSeed } from "../seed";
import type { Employee, EmployeeDocument, DB } from "../types";

let inMemorySeed: DB = createSeed();

function getFallbackData(): DB {
  return inMemorySeed;
}

export class ProfileRepository {
  /**
   * Retrieves employee record by ID
   */
  async getProfile(id: string): Promise<Employee | null> {
    const seed = getFallbackData();
    const emp = (seed.employees || []).find((e: Employee) => e.id === id);
    return emp ? { ...emp } : null;
  }

  /**
   * Updates allowed self-service personal information
   */
  async updatePersonalInfo(id: string, updates: Partial<Employee>): Promise<Employee | null> {
    const seed = getFallbackData();
    const emp = (seed.employees || []).find((e: Employee) => e.id === id);
    if (!emp) return null;

    if (updates.phone !== undefined) emp.phone = updates.phone;
    if (updates.address !== undefined) emp.address = updates.address;
    if (updates.dob !== undefined) emp.dob = updates.dob;
    if (updates.gender !== undefined) emp.gender = updates.gender;
    if (updates.bankAccount !== undefined) emp.bankAccount = updates.bankAccount;
    if (updates.emergencyContact !== undefined) emp.emergencyContact = updates.emergencyContact;
    if (updates.skills !== undefined) emp.skills = updates.skills;

    return { ...emp };
  }

  /**
   * Verifies current password against stored credentials
   */
  async verifyPassword(id: string, plainText: string): Promise<boolean> {
    const seed = getFallbackData();
    const emp = (seed.employees || []).find((e: Employee) => e.id === id);
    if (!emp) return false;
    return emp.password === plainText;
  }

  /**
   * Updates employee account password
   */
  async updatePassword(id: string, newPassword: string): Promise<boolean> {
    const seed = getFallbackData();
    const emp = (seed.employees || []).find((e: Employee) => e.id === id);
    if (!emp) return false;
    emp.password = newPassword;
    return true;
  }

  /**
   * Appends an employee document to their profile
   */
  async addDocument(
    employeeId: string,
    doc: { name: string; type: EmployeeDocument["type"]; url?: string }
  ): Promise<EmployeeDocument | null> {
    const seed = getFallbackData();
    const emp = (seed.employees || []).find((e: Employee) => e.id === employeeId);
    if (!emp) return null;

    const newDoc: EmployeeDocument = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: doc.name,
      type: doc.type,
      uploadedAt: new Date().toISOString(),
      verified: false,
    };

    if (!emp.documents) emp.documents = [];
    emp.documents.unshift(newDoc);
    return { ...newDoc };
  }

  /**
   * Toggles completion status of an onboarding checklist document
   */
  async toggleOnboardingDoc(employeeId: string, docId: string): Promise<boolean> {
    const seed = getFallbackData();
    const emp = (seed.employees || []).find((e: Employee) => e.id === employeeId);
    if (!emp || !emp.onboarding) return false;

    const target = emp.onboarding.documentsRequired.find((d) => d.id === docId);
    if (!target) return false;

    target.done = !target.done;
    return true;
  }

  /**
   * Traces upward manager chain
   */
  async getManagerChain(employeeId: string): Promise<Employee[]> {
    const seed = getFallbackData();
    const all = seed.employees || [];
    const chain: Employee[] = [];
    let cur = all.find((e: Employee) => e.id === employeeId);
    const visited = new Set<string>();

    while (cur?.managerId && !visited.has(cur.managerId)) {
      visited.add(cur.managerId);
      const mgr = all.find((e: Employee) => e.id === cur!.managerId);
      if (!mgr) break;
      chain.push(mgr);
      cur = mgr;
    }
    return chain;
  }

  /**
   * Finds direct reports
   */
  async getDirectReports(employeeId: string): Promise<Employee[]> {
    const seed = getFallbackData();
    return (seed.employees || []).filter((e: Employee) => e.managerId === employeeId && e.status !== "TERMINATED");
  }
}

export const profileRepository = new ProfileRepository();

