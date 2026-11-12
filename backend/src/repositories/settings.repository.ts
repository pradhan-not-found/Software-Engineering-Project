/**
 * Organization Settings & Holidays Data Access Layer (DAL)
 * Layer 2: Repository Layer
 */

import { supabase, isSupabaseConfigured } from "../supabase";
import type { OrgSettings, Department, Holiday, DB } from "../types";
import { createSeed } from "../seed";

let inMemorySeed: DB = createSeed();

function getFallbackData(): DB {
  return inMemorySeed;
}

export interface DepartmentWithDetails extends Department {
  headcount: number;
  headName: string | null;
}

export class SettingsRepository {
  /**
   * Fetch Organization Workspace Settings
   */
  async getOrgSettings(): Promise<OrgSettings> {
    const seed = getFallbackData();
    return { ...seed.org };
  }

  /**
   * Update Organization Workspace Profile
   */
  async updateOrgSettings(patch: Partial<OrgSettings>): Promise<OrgSettings> {
    const seed = getFallbackData();
    Object.assign(seed.org, patch);
    return { ...seed.org };
  }

  /**
   * List Departments with Live Headcount and Head Employee Details
   */
  async getDepartments(): Promise<DepartmentWithDetails[]> {
    const seed = getFallbackData();
    const activeEmps = seed.employees.filter((e) => e.status !== "TERMINATED");

    return seed.departments.map((d) => {
      const head = seed.employees.find((e) => e.id === d.headId);
      const headcount = activeEmps.filter((e) => e.departmentId === d.id).length;
      return {
        ...d,
        headcount,
        headName: head ? `${head.firstName} ${head.lastName}` : null,
      };
    });
  }

  /**
   * Find Department by Code (case-insensitive)
   */
  async findDepartmentByCode(code: string): Promise<Department | null> {
    const seed = getFallbackData();
    const d = seed.departments.find((x) => x.code.toLowerCase() === code.toLowerCase());
    return d ? { ...d } : null;
  }

  /**
   * Create New Department
   */
  async createDepartment(input: {
    name: string;
    code: string;
    color: string;
    headId?: string | null;
  }): Promise<Department> {
    const seed = getFallbackData();
    const id = `dept_${Date.now().toString(36)}`;
    const newDept: Department = {
      id,
      name: input.name,
      code: input.code.toUpperCase(),
      color: input.color || "blue",
      headId: input.headId || null,
    };

    seed.departments.push(newDept);
    return { ...newDept };
  }

  /**
   * Get Holidays (optionally filtered by year)
   */
  async getHolidays(year?: string | number): Promise<Holiday[]> {
    const seed = getFallbackData();
    let holidays = [...seed.holidays];

    if (year) {
      const yrStr = String(year);
      holidays = holidays.filter((h) => h.date.startsWith(yrStr));
    }

    return holidays.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Find Holiday on Date
   */
  async findHolidayByDate(date: string): Promise<Holiday | null> {
    const seed = getFallbackData();
    const h = seed.holidays.find((x) => x.date === date);
    return h ? { ...h } : null;
  }

  /**
   * Find Holiday by ID
   */
  async findHolidayById(id: string): Promise<Holiday | null> {
    const seed = getFallbackData();
    const h = seed.holidays.find((x) => x.id === id);
    return h ? { ...h } : null;
  }

  /**
   * Create New Holiday
   */
  async createHoliday(input: {
    date: string;
    name: string;
    type: Holiday["type"];
  }): Promise<Holiday> {
    const seed = getFallbackData();
    const id = `h_${Date.now().toString(36)}`;
    const newHoliday: Holiday = {
      id,
      date: input.date,
      name: input.name,
      type: input.type,
    };

    seed.holidays.push(newHoliday);
    seed.holidays.sort((a, b) => a.date.localeCompare(b.date));
    return { ...newHoliday };
  }

  /**
   * Delete Holiday by ID
   */
  async deleteHoliday(id: string): Promise<boolean> {
    const seed = getFallbackData();
    const initialLen = seed.holidays.length;
    seed.holidays = seed.holidays.filter((h) => h.id !== id);
    return seed.holidays.length < initialLen;
  }

  /**
   * Reset Demo Organization Data
   */
  async resetDemoData(): Promise<void> {
    inMemorySeed = createSeed();
  }
}

export const settingsRepository = new SettingsRepository();
