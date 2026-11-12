// backend/src/repositories/team.repository.ts
// Layer 2: Repository Data Access for My Team & Department Collaboration Hub

import { seed } from "../seed";
import type { Employee, Attendance, LeaveRequest, Task, Timesheet, Review, ReviewCycle } from "../types";

export class TeamRepository {
  /**
   * Retrieves immediate direct reports for a manager
   */
  async getDirectReports(managerId: string): Promise<Employee[]> {
    return (seed.employees || []).filter((e) => e.managerId === managerId && e.status !== "TERMINATED");
  }

  /**
   * Recursively retrieves all subordinates beneath a manager
   */
  async getAllSubordinates(managerId: string): Promise<Employee[]> {
    const all = seed.employees || [];
    const subordinates: Employee[] = [];
    const queue = [managerId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (visited.has(cur)) continue;
      visited.add(cur);

      const direct = all.filter((e) => e.managerId === cur && e.status !== "TERMINATED");
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
    const set = new Set(employeeIds);
    return (seed.attendance || []).filter((a) => set.has(a.employeeId) && a.date === date);
  }

  /**
   * Retrieves leave records for a list of employees
   */
  async getTeamLeaves(employeeIds: string[]): Promise<LeaveRequest[]> {
    const set = new Set(employeeIds);
    return (seed.leaves || []).filter((l) => set.has(l.employeeId));
  }

  /**
   * Retrieves tasks assigned to any member of a list of employees
   */
  async getTeamTasks(employeeIds: string[]): Promise<Task[]> {
    const set = new Set(employeeIds);
    return (seed.tasks || []).filter((t) => t.assigneeIds.some((a) => set.has(a)));
  }

  /**
   * Retrieves timesheets submitted by direct reports
   */
  async getTeamTimesheets(directReportIds: string[]): Promise<Timesheet[]> {
    const set = new Set(directReportIds);
    return (seed.timesheets || []).filter((ts) => set.has(ts.employeeId) && ts.status === "SUBMITTED");
  }

  /**
   * Retrieves active performance review cycle
   */
  async getActiveReviewCycle(): Promise<ReviewCycle | null> {
    const cycle = (seed.cycles || []).find((c) => c.status === "ACTIVE");
    return cycle ? { ...cycle } : null;
  }

  /**
   * Retrieves reviews assigned to reviewer in active cycle
   */
  async getTeamReviews(reviewerId: string, cycleId: string): Promise<Review[]> {
    return (seed.reviews || []).filter((r) => r.reviewerId === reviewerId && r.cycleId === cycleId);
  }

  /**
   * Reassigns task from one employee to another
   */
  async reassignTask(taskId: string, fromId: string, toId: string): Promise<Task | null> {
    const task = (seed.tasks || []).find((t) => t.id === taskId);
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

