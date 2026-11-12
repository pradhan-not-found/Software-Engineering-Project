// frontend/src/lib/services/team.service.ts
// Layer 3: Domain Service for My Team & Department Collaboration Hub

import { teamRepository, TeamRepository } from "../repositories/team.repository";
import { employeeRepository } from "../repositories/employee.repository";
import { notificationRepository } from "../repositories/notification.repository";
import type { Employee, LeaveRequest, Task, Timesheet, Review, Role, ReviewCycle } from "../types";
import {
  type TeamFilterInput,
  type ReassignTaskInput,
  validateTeamFilterInput,
  validateReassignTaskInput,
} from "../validations/team.schema";

export interface CurrentUserActor {
  id: string;
  role: Role;
  firstName?: string;
  lastName?: string;
}

export interface MemberWorkload {
  employee: Omit<Employee, "password">;
  isDirect: boolean;
  attendanceStatus: string | null;
  upcomingLeave: { startDate: string; endDate: string; type: string } | null;
  openTasksCount: number;
  overdueTasksCount: number;
  flaggedTasksCount: number;
  loadLevel: "green" | "amber" | "red";
  loadLabel: "Available" | "Busy" | "Overloaded";
}

export interface TeamOverviewPayload {
  isManager: boolean;
  directReportsCount: number;
  subordinatesCount: number;
  metrics: {
    outTodayCount: number;
    outTodayNames: string[];
    pendingLeaveCount: number;
    flaggedTaskCount: number;
    reviewsToWriteCount: number;
  };
  workload: MemberWorkload[];
  pendingLeaves: (LeaveRequest & {
    employeeName: string;
    tasksDueInWindowCount: number;
    overlappingPeersCount: number;
  })[];
  flaggedTasks: (Task & {
    assigneeName: string;
    suggestedPeerCover: { id: string; name: string; openTasksCount: number } | null;
  })[];
  timesheets: Timesheet[];
  reviews: Review[];
  activeCycle: ReviewCycle | null;
}

export class TeamService {
  constructor(private repo: TeamRepository = teamRepository) {}

  private isAdminRole(role: Role): boolean {
    return role === "SUPER_ADMIN" || role === "HR_ADMIN";
  }

  private sanitize(e: Employee): Omit<Employee, "password"> {
    const { password, ...safe } = e;
    return safe;
  }

  /**
   * Generates comprehensive managerial overview combining attendance, workload, leaves, and reviews
   */
  async getTeamOverview(
    actor: CurrentUserActor,
    rawFilter?: any
  ): Promise<{ ok: true; data: TeamOverviewPayload } | { ok: false; error: string }> {
    const filterValidation = validateTeamFilterInput(rawFilter);
    if (!filterValidation.ok) {
      return { ok: false, error: filterValidation.error };
    }

    const filter = filterValidation.data;
    const targetDate = filter.date || new Date().toISOString().slice(0, 10);

    const directReports = await this.repo.getDirectReports(actor.id);
    const subordinates = await this.repo.getAllSubordinates(actor.id);
    const isManager = directReports.length > 0 || this.isAdminRole(actor.role);

    if (!isManager) {
      return {
        ok: true,
        data: {
          isManager: false,
          directReportsCount: 0,
          subordinatesCount: 0,
          metrics: {
            outTodayCount: 0,
            outTodayNames: [],
            pendingLeaveCount: 0,
            flaggedTaskCount: 0,
            reviewsToWriteCount: 0,
          },
          workload: [],
          pendingLeaves: [],
          flaggedTasks: [],
          timesheets: [],
          reviews: [],
          activeCycle: null,
        },
      };
    }

    const teamMembers = filter.includeIndirect ? subordinates : directReports;
    const teamMemberIds = teamMembers.map((e) => e.id);
    const directIds = new Set(directReports.map((e) => e.id));

    // Aggregations across all subsystems
    const attendance = await this.repo.getTeamAttendance(teamMemberIds, targetDate);
    const leaves = await this.repo.getTeamLeaves(teamMemberIds);
    const tasks = await this.repo.getTeamTasks(teamMemberIds);
    const timesheets = await this.repo.getTeamTimesheets(Array.from(directIds));
    const activeCycle = await this.repo.getActiveReviewCycle();
    const reviews = activeCycle ? await this.repo.getTeamReviews(actor.id, activeCycle.id) : [];

    // Out today calculation
    const outToday = teamMembers.filter((e) =>
      leaves.some(
        (l) => l.employeeId === e.id && l.status === "APPROVED" && l.startDate <= targetDate && l.endDate >= targetDate
      )
    );

    // Pending leaves with contextual risk assessment
    const pendingLeaves = leaves
      .filter((l) => l.status === "PENDING" && teamMemberIds.includes(l.employeeId))
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .map((l) => {
        const emp = teamMembers.find((e) => e.id === l.employeeId);
        const empName = emp ? `${emp.firstName} ${emp.lastName}` : "Employee";
        const tasksDue = tasks.filter(
          (t) =>
            t.assigneeIds.includes(l.employeeId) &&
            !t.completedAt &&
            t.dueDate &&
            t.dueDate >= l.startDate &&
            t.dueDate <= l.endDate
        );
        const overlapping = teamMembers.filter(
          (s) =>
            s.id !== l.employeeId &&
            leaves.some(
              (x) =>
                x.employeeId === s.id &&
                x.status === "APPROVED" &&
                x.startDate <= l.endDate &&
                x.endDate >= l.startDate
            )
        );

        return {
          ...l,
          employeeName: empName,
          tasksDueInWindowCount: tasksDue.length,
          overlappingPeersCount: overlapping.length,
        };
      });

    // Flagged tasks with intelligent peer cover recommendation
    const openTasks = tasks.filter((t) => !t.completedAt);
    const flagged = openTasks.filter((t) => t.flag !== "NORMAL");

    const enrichedFlagged = flagged.map((task) => {
      const fromId = task.assigneeIds.find((id) => teamMemberIds.includes(id)) || task.assigneeIds[0];
      const fromEmp = teamMembers.find((e) => e.id === fromId);
      const assigneeName = fromEmp ? `${fromEmp.firstName} ${fromEmp.lastName}` : "Team Member";

      // Find available peer in same department with least open load
      let suggestedPeerCover: { id: string; name: string; openTasksCount: number } | null = null;
      if (fromEmp) {
        const peers = teamMembers.filter((p) => p.id !== fromId && p.departmentId === fromEmp.departmentId);
        if (peers.length > 0) {
          const peerLoads = peers.map((p) => ({
            id: p.id,
            name: `${p.firstName} ${p.lastName}`,
            openTasksCount: openTasks.filter((t) => t.assigneeIds.includes(p.id)).length,
          }));
          peerLoads.sort((a, b) => a.openTasksCount - b.openTasksCount);
          suggestedPeerCover = peerLoads[0];
        }
      }

      return {
        ...task,
        assigneeName,
        suggestedPeerCover,
      };
    });

    // Team Workload table rows
    const workload: MemberWorkload[] = teamMembers.map((e) => {
      const att = attendance.find((a) => a.employeeId === e.id);
      const memberOpen = openTasks.filter((t) => t.assigneeIds.includes(e.id));
      const overdue = memberOpen.filter((t) => t.dueDate && t.dueDate < targetDate).length;
      const fl = memberOpen.filter((t) => t.flag !== "NORMAL").length;
      const upcoming = leaves
        .filter((l) => l.employeeId === e.id && l.status === "APPROVED" && l.endDate >= targetDate)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];

      const count = memberOpen.length;
      const loadLevel = count >= 6 ? "red" : count >= 3 ? "amber" : "green";
      const loadLabel = count >= 6 ? "Overloaded" : count >= 3 ? "Busy" : "Available";

      return {
        employee: this.sanitize(e),
        isDirect: directIds.has(e.id),
        attendanceStatus: att?.status || null,
        upcomingLeave: upcoming
          ? { startDate: upcoming.startDate, endDate: upcoming.endDate, type: upcoming.type }
          : null,
        openTasksCount: count,
        overdueTasksCount: overdue,
        flaggedTasksCount: fl,
        loadLevel,
        loadLabel,
      };
    });

    return {
      ok: true,
      data: {
        isManager: true,
        directReportsCount: directReports.length,
        subordinatesCount: subordinates.length,
        metrics: {
          outTodayCount: outToday.length,
          outTodayNames: outToday.map((e) => e.firstName),
          pendingLeaveCount: pendingLeaves.length,
          flaggedTaskCount: enrichedFlagged.length,
          reviewsToWriteCount: reviews.filter((r) => r.status !== "COMPLETED").length,
        },
        workload,
        pendingLeaves,
        flaggedTasks: enrichedFlagged,
        timesheets,
        reviews,
        activeCycle,
      },
    };
  }

  /**
   * Reassigns a delayed or flagged task from an absent member to an available peer
   */
  async reassignTaskCover(
    actor: CurrentUserActor,
    rawInput: any
  ): Promise<{ ok: true; data: Task } | { ok: false; error: string }> {
    const validation = validateReassignTaskInput(rawInput);
    if (!validation.ok) {
      return { ok: false, error: validation.error };
    }

    const { taskId, fromEmployeeId, toEmployeeId } = validation.data;

    // RBAC: Actor must be manager of fromEmployeeId or an Admin
    const isAdmin = this.isAdminRole(actor.role);
    if (!isAdmin) {
      const subs = await this.repo.getAllSubordinates(actor.id);
      const isSubordinate = subs.some((s) => s.id === fromEmployeeId);
      if (!isSubordinate) {
        return { ok: false, error: "Only administrators or direct managers can reassign tasks for this employee." };
      }
    }

    const fromEmp = await employeeRepository.findById(fromEmployeeId);
    const toEmp = await employeeRepository.findById(toEmployeeId);

    if (!fromEmp || !toEmp) {
      return { ok: false, error: "Assignee employees not found." };
    }

    const updatedTask = await this.repo.reassignTask(taskId, fromEmployeeId, toEmployeeId);
    if (!updatedTask) {
      return { ok: false, error: "Task not found." };
    }

    // Connected Wedge: Audit log & notification triggers
    const fromName = `${fromEmp.firstName} ${fromEmp.lastName}`;
    const toName = `${toEmp.firstName} ${toEmp.lastName}`;

    await notificationRepository.createActivityLog({
      actorId: actor.id,
      action: "UPDATE",
      entity: "Task",
      message: `${actor.firstName ?? "Manager"} reassigned task “${updatedTask.title}” from ${fromName} to ${toName}.`,
      category: "WORK",
    });

    await notificationRepository.createNotification({
      recipientId: toEmployeeId,
      title: "Task Reassigned to You",
      message: `You have been assigned to cover “${updatedTask.title}” previously with ${fromName}.`,
      category: "WORK",
      link: "/employee/tasks",
    });

    return { ok: true, data: updatedTask };
  }
}

export const teamService = new TeamService();

