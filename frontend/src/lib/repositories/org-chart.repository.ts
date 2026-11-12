// frontend/src/lib/repositories/org-chart.repository.ts
// Layer 2: Repository Data Access for Organization Hierarchy & Org Chart

import { createSeed } from "../seed";
import type { Employee, Department, DB } from "../types";

let inMemorySeed: DB = createSeed();

function getFallbackData(): DB {
  return inMemorySeed;
}

export class OrgChartRepository {
  /**
   * Retrieves employees for org chart (default filters out TERMINATED)
   */
  async getEmployees(includeTerminated = false): Promise<Employee[]> {
    const seed = getFallbackData();
    const list = seed.employees || [];
    if (includeTerminated) {
      return [...list];
    }
    return list.filter((e) => e.status !== "TERMINATED");
  }

  /**
   * Retrieves all departments
   */
  async getDepartments(): Promise<Department[]> {
    const seed = getFallbackData();
    return [...(seed.departments || [])];
  }

  /**
   * Finds single employee by ID
   */
  async findById(id: string): Promise<Employee | null> {
    const seed = getFallbackData();
    const emp = (seed.employees || []).find((e) => e.id === id);
    return emp ? { ...emp } : null;
  }

  /**
   * Returns immediate direct reports for a manager
   */
  async getDirectReports(managerId: string): Promise<Employee[]> {
    const seed = getFallbackData();
    return (seed.employees || []).filter((e) => e.managerId === managerId && e.status !== "TERMINATED");
  }

  /**
   * Recursively computes all subordinates in the reporting tree beneath an employee
   */
  async getAllSubordinates(employeeId: string): Promise<Employee[]> {
    const seed = getFallbackData();
    const all = seed.employees || [];
    const subordinates: Employee[] = [];
    const queue = [employeeId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const direct = all.filter((e) => e.managerId === current && e.status !== "TERMINATED");
      for (const d of direct) {
        if (!visited.has(d.id)) {
          subordinates.push(d);
          queue.push(d.id);
        }
      }
    }

    return subordinates;
  }

  /**
   * Traces upward manager chain from an employee to the root
   */
  async getManagerChain(employeeId: string): Promise<Employee[]> {
    const seed = getFallbackData();
    const all = seed.employees || [];
    const chain: Employee[] = [];
    let current = all.find((e) => e.id === employeeId);
    const visited = new Set<string>();

    while (current?.managerId && !visited.has(current.managerId)) {
      visited.add(current.managerId);
      const mgr = all.find((e) => e.id === current!.managerId);
      if (!mgr) break;
      chain.push(mgr);
      current = mgr;
    }

    return chain;
  }

  /**
   * Reassigns employee's manager
   */
  async updateManager(employeeId: string, managerId: string | null): Promise<Employee | null> {
    const seed = getFallbackData();
    const emp = (seed.employees || []).find((e) => e.id === employeeId);
    if (!emp) return null;

    emp.managerId = managerId;
    return { ...emp };
  }
}

export const orgChartRepository = new OrgChartRepository();
