// frontend/src/lib/services/org-chart.service.ts
// Layer 3: Domain Service for Organization Hierarchy & Org Chart Engine

import { orgChartRepository, OrgChartRepository } from "../repositories/org-chart.repository";
import { notificationRepository } from "../repositories/notification.repository";
import type { Employee, Department, Role } from "../types";
import {
  type OrgChartFilterInput,
  type ReassignManagerInput,
  validateOrgChartFilter,
  validateReassignManagerInput,
} from "../validations/org-chart.schema";

export interface CurrentUserActor {
  id: string;
  role: Role;
  firstName?: string;
  lastName?: string;
}

export interface OrgNode {
  id: string;
  code: string;
  name: string;
  email: string;
  designation: string;
  role: Role;
  status: string;
  departmentId: string;
  department?: Department | null;
  managerId: string | null;
  directReportsCount: number;
  subordinatesCount: number;
  canAssignWork: boolean;
}

export interface OrgHierarchyPayload {
  roots: OrgNode[];
  nodes: OrgNode[];
  departments: Department[];
  metrics: {
    totalPeople: number;
    totalManagers: number;
    totalDepartments: number;
    maxSpanOfControl: number;
  };
  mySubtreeIds: string[];
}

export class OrgChartService {
  constructor(private repo: OrgChartRepository = orgChartRepository) {}

  private isAdminRole(role: Role): boolean {
    return role === "SUPER_ADMIN" || role === "HR_ADMIN";
  }

  /**
   * Generates organization hierarchy tree, departmental clusters, and executive metrics
   */
  async getHierarchy(
    actor: CurrentUserActor,
    rawFilter?: any
  ): Promise<{ ok: true; data: OrgHierarchyPayload } | { ok: false; error: string }> {
    const filterValidation = validateOrgChartFilter(rawFilter);
    if (!filterValidation.ok) {
      return { ok: false, error: filterValidation.error };
    }

    const filter = filterValidation.data;
    const allEmployees = await this.repo.getEmployees(filter.includeTerminated);
    const departments = await this.repo.getDepartments();

    const deptMap = new Map(departments.map((d) => [d.id, d]));

    // Compute actor's subordinate tree (Connected Wedge: task assignment & visibility inheritance)
    const mySubtree = await this.repo.getAllSubordinates(actor.id);
    const mySubtreeSet = new Set(mySubtree.map((e) => e.id));

    // Map each employee to an enriched OrgNode
    const nodes: OrgNode[] = await Promise.all(
      allEmployees.map(async (e) => {
        const direct = allEmployees.filter((x) => x.managerId === e.id);
        const sub = await this.repo.getAllSubordinates(e.id);
        return {
          id: e.id,
          code: e.code,
          name: `${e.firstName} ${e.lastName}`.trim(),
          email: e.email,
          designation: e.designation,
          role: e.role,
          status: e.status,
          departmentId: e.departmentId,
          department: deptMap.get(e.departmentId) || null,
          managerId: e.managerId,
          directReportsCount: direct.length,
          subordinatesCount: sub.length,
          canAssignWork: e.id === actor.id || mySubtreeSet.has(e.id),
        };
      })
    );

    // Filter nodes if search query or departmentId specified
    let filteredNodes = nodes;
    if (filter.departmentId && filter.departmentId !== "all") {
      filteredNodes = filteredNodes.filter((n) => n.departmentId === filter.departmentId);
    }
    if (filter.query) {
      const q = filter.query.toLowerCase();
      filteredNodes = filteredNodes.filter(
        (n) => n.name.toLowerCase().includes(q) || n.designation.toLowerCase().includes(q)
      );
    }

    // Roots are employees without a manager in active set
    const allIds = new Set(allEmployees.map((e) => e.id));
    const roots = filteredNodes.filter((n) => !n.managerId || !allIds.has(n.managerId));

    // Executive Hierarchy Metrics
    const managers = nodes.filter((n) => n.directReportsCount > 0);
    const maxSpan = managers.length > 0 ? Math.max(...managers.map((m) => m.directReportsCount)) : 0;

    return {
      ok: true,
      data: {
        roots,
        nodes: filteredNodes,
        departments,
        metrics: {
          totalPeople: allEmployees.length,
          totalManagers: managers.length,
          totalDepartments: departments.length,
          maxSpanOfControl: maxSpan,
        },
        mySubtreeIds: Array.from(mySubtreeSet),
      },
    };
  }

  /**
   * Reassigns employee reporting line with cycle prevention & Connected Wedge audit
   */
  async reassignManager(
    actor: CurrentUserActor,
    rawInput: any
  ): Promise<{ ok: true; data: Employee } | { ok: false; error: string }> {
    const validation = validateReassignManagerInput(rawInput);
    if (!validation.ok) {
      return { ok: false, error: validation.error };
    }

    const { employeeId, managerId } = validation.data;

    // RBAC: Only SUPER_ADMIN, HR_ADMIN, or a manager reassigning within their own subtree
    const isAdmin = this.isAdminRole(actor.role);
    if (!isAdmin) {
      const actorSubtree = await this.repo.getAllSubordinates(actor.id);
      const canManage = actorSubtree.some((s) => s.id === employeeId);
      if (!canManage) {
        return { ok: false, error: "Only administrators or direct superiors can reassign reporting lines." };
      }
    }

    const targetEmp = await this.repo.findById(employeeId);
    if (!targetEmp) {
      return { ok: false, error: "Target employee not found." };
    }
    if (targetEmp.status === "TERMINATED") {
      return { ok: false, error: "Cannot reassign reporting lines for a terminated employee." };
    }

    // If new manager specified, perform strict validation
    if (managerId !== null) {
      const newMgr = await this.repo.findById(managerId);
      if (!newMgr) {
        return { ok: false, error: "Designated manager not found." };
      }
      if (newMgr.status === "TERMINATED") {
        return { ok: false, error: "Cannot assign an employee to report to a terminated manager." };
      }

      // Cycle Prevention Guard 1: Direct self-reporting
      if (employeeId === managerId) {
        return { ok: false, error: "An employee cannot be assigned as their own manager." };
      }

      // Cycle Prevention Guard 2: Subordinate cycle detection
      const employeeSubordinates = await this.repo.getAllSubordinates(employeeId);
      const isSubordinate = employeeSubordinates.some((s) => s.id === managerId);
      if (isSubordinate) {
        return {
          ok: false,
          error: `Cycle detected: Cannot assign ${targetEmp.firstName} to report to ${newMgr.firstName}, who is currently in their reporting subtree.`,
        };
      }
    }

    // Execute reassignment
    const updated = await this.repo.updateManager(employeeId, managerId);
    if (!updated) {
      return { ok: false, error: "Failed to update reporting line." };
    }

    // Connected Wedge: Log activity and send notifications
    const targetName = `${targetEmp.firstName} ${targetEmp.lastName}`.trim();
    let mgrName = "None (Top Level)";
    if (managerId) {
      const m = await this.repo.findById(managerId);
      if (m) mgrName = `${m.firstName} ${m.lastName}`.trim();
    }

    await notificationRepository.createActivityLog({
      actorId: actor.id,
      action: "UPDATE",
      entity: "ReportingLine",
      message: `${actor.firstName ?? "User"} updated ${targetName}'s manager to ${mgrName}.`,
      category: "HR",
    });

    await notificationRepository.createNotification({
      recipientId: employeeId,
      title: "Reporting Line Updated",
      message: `Your direct manager has been changed to ${mgrName}.`,
      category: "HR",
      link: "/employee/org-chart",
    });

    if (managerId) {
      await notificationRepository.createNotification({
        recipientId: managerId,
        title: "New Direct Report",
        message: `${targetName} now reports directly to you.`,
        category: "HR",
        link: "/employee/team",
      });
    }

    return { ok: true, data: updated };
  }
}

export const orgChartService = new OrgChartService();
