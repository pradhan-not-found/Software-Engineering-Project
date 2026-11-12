// frontend/src/lib/repositories/team.repository.ts
// Layer 2: Repository Data Access for My Team & Department Collaboration Hub

import { createSeed } from "../seed";
import type { Employee, Attendance, LeaveRequest, Task, Timesheet, Review, ReviewCycle, DB } from "../types";

let inMemorySeed: DB = createSeed();

function getFallbackData(): DB {
  return inMemorySeed;
}

export class TeamRepository {
  /**
   * Retrieves immediate direct reports for a manager
   */
  async getDirectReports(managerId: string): Promise<Employee[]> {
    const seed = getFallbackData();
    return (seed.employees || []).filter((e: Employee) => e.managerId === managerId && e.status !== "TERMINATED");
  }

  /**
   * Recursively retrieves all subordinates beneath a manager
   */
  async getAllSubordinates(managerId: string): Promise<Employee[]> {
    const seed = getFallbackData();
    const all = seed.employees || [];
    const subordinates: Employee[] = [];
    const queue = [managerId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (visited.has(cur)) continue;
      visited.add(cur);

      const direct = all.filter((e: Employee) => e.managerId === cur && e.status !== "TERMINATED");
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
   * Retrieves attendance records for a list of employees on a specific date
   */
  async getTeamAttendance(employeeIds: string[], date: string): Promise<Attendance[]> {
    const seed = getFallbackData();
    const set = new Set(employeeIds);
    return (seed.attendance || []).filter((a: Attendance) => set.has(a.employeeId) && a.date === date);
  }

  /**
   * Retrieves leave records for a list of employees
   */
  async getTeamLeaves(employeeIds: string[]): Promise<LeaveRequest[]> {
    const seed = getFallbackData();
    const set = new Set(employeeIds);
    return (seed.leaves || []).filter((l: LeaveRequest) => set.has(l.employeeId));
  }

  /**
   * Retrieves tasks assigned to any member of a list of employees
   */
  async getTeamTasks(employeeIds: string[]): Promise<Task[]> {
    const seed = getFallbackData();
    const set = new Set(employeeIds);
    return (seed.tasks || []).filter((t: Task) => t.assigneeIds.some((a) => set.has(a)));
  }

  /**
   * Retrieves timesheets submitted by direct reports
   */
  async getTeamTimesheets(directReportIds: string[]): Promise<Timesheet[]> {
    const seed = getFallbackData();
    const set = new Set(directReportIds);
    return (seed.timesheets || []).filter((ts: Timesheet) => set.has(ts.employeeId) && ts.status === "SUBMITTED");
  }

  /**
   * Retrieves active performance review cycle
   */
  async getActiveReviewCycle(): Promise<ReviewCycle | null> {
    const seed = getFallbackData();
    const cycle = (seed.cycles || []).find((c: ReviewCycle) => c.status === "ACTIVE");
    return cycle ? { ...cycle } : null;
  }

  /**
   * Retrieves reviews assigned to reviewer in active cycle
   */
  async getTeamReviews(reviewerId: string, cycleId: string): Promise<Review[]> {
    const seed = getFallbackData();
    return (seed.reviews || []).filter((r: Review) => r.reviewerId === reviewerId && r.cycleId === cycleId);
  }

  /**
   * Reassigns task from one employee to another
   */
  async reassignTask(taskId: string, fromId: string, toId: string): Promise<Task | null> {
    const seed = getFallbackData();
    const task = (seed.tasks || []).find((t: Task) => t.id === taskId);
    if (!task) return null;

    task.assigneeIds = task.assigneeIds.filter((id) => id !== fromId);
    if (!task.assigneeIds.includes(toId)) {
      task.assigneeIds.push(toId);
    }
    // If flagged due to leave, reset flag to normal once covered
    if (task.flag === "DELAYED_ON_LEAVE") {
      task.flag = "NORMAL";
    }

    return { ...task };
  }
}

export const teamRepository = new TeamRepository();

