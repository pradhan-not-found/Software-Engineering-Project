/**
 * Access Control & RBAC Domain Service
 * Layer 3: Service Layer
 */

import type { Role, ModuleKey, AccountStatus, PermissionMatrix, Employee } from "../types";
import { accessRepository, AccessRepository } from "../repositories/access.repository";
import type {
  SetRoleInput,
  SetAccountStatusInput,
  ResetPasswordInput,
  TogglePermissionInput,
} from "../validations/access.schema";

export interface ActorContext {
  id: string;
  role: Role;
  firstName?: string;
  lastName?: string;
}

export interface AccessMatrixResult {
  permissions: PermissionMatrix;
  roleCounts: Record<Role, number>;
  canEdit: boolean;
}

export class AccessService {
  constructor(private accessRepo: AccessRepository = accessRepository) {}

  /**
   * Retrieve the current permission matrix, role counts, and editor capability
   */
  async getMatrix(actor?: ActorContext): Promise<AccessMatrixResult> {
    const [permissions, roleCounts] = await Promise.all([
      this.accessRepo.getPermissions(),
      this.accessRepo.getRoleCounts(),
    ]);

    const canEdit = actor?.role === "SUPER_ADMIN";
    return {
      permissions,
      roleCounts,
      canEdit,
    };
  }

  /**
   * Toggle a permission cell for a role
   * Security Rule: Only SUPER_ADMIN can modify permissions.
   * Lockout Rule: Cannot disable "access" module for SUPER_ADMIN.
   */
  async togglePermission(
    actor: ActorContext,
    input: TogglePermissionInput
  ): Promise<{ ok: true; data: { permissions: PermissionMatrix; role: Role; module: ModuleKey; enabled: boolean } } | { ok: false; error: string }> {
    if (actor.role !== "SUPER_ADMIN") {
      return { ok: false, error: "Only a Super Admin can edit permissions." };
    }

    if (input.role === "SUPER_ADMIN" && input.module === "access") {
      return { ok: false, error: "Access control cannot be disabled for Super Admin." };
    }

    const result = await this.accessRepo.updatePermission(input.role, input.module, input.enabled);

    return {
      ok: true,
      data: {
        permissions: result.permissions,
        role: input.role,
        module: input.module,
        enabled: result.current,
      },
    };
  }

  /**
   * Update an employee's access role
   * Security Rule: Only SUPER_ADMIN can grant SUPER_ADMIN.
   * Demotion Rule: At least one SUPER_ADMIN must always remain.
   */
  async setRole(
    actor: ActorContext,
    input: SetRoleInput
  ): Promise<{ ok: true; data: { employee: Employee; previousRole: Role } } | { ok: false; error: string }> {
    const target = await this.accessRepo.findEmployeeById(input.employeeId);
    if (!target) {
      return { ok: false, error: "Employee not found." };
    }

    if (input.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") {
      return { ok: false, error: "Only a Super Admin can grant Super Admin." };
    }

    if (target.role === "SUPER_ADMIN" && input.role !== "SUPER_ADMIN") {
      const superAdminCount = await this.accessRepo.findSuperAdminCount();
      if (superAdminCount <= 1) {
        return { ok: false, error: "At least one Super Admin is required." };
      }
    }

    const result = await this.accessRepo.setRole(input.employeeId, input.role);

    return {
      ok: true,
      data: result,
    };
  }

  /**
   * Update an employee's account status (ACTIVE | SUSPENDED)
   * Self-Lockout Rule: Cannot suspend own account.
   * Super Admin Lockout Rule: Cannot suspend the last active Super Admin.
   */
  async setAccountStatus(
    actor: ActorContext,
    input: SetAccountStatusInput
  ): Promise<{ ok: true; data: { employee: Employee; previousStatus: AccountStatus } } | { ok: false; error: string }> {
    if (input.employeeId === actor.id) {
      return { ok: false, error: "You cannot suspend your own account." };
    }

    const target = await this.accessRepo.findEmployeeById(input.employeeId);
    if (!target) {
      return { ok: false, error: "Employee not found." };
    }

    if (target.role === "SUPER_ADMIN" && input.status === "SUSPENDED") {
      const activeSuperAdmins = await this.accessRepo.findActiveSuperAdminCount();
      if (activeSuperAdmins <= 1) {
        return { ok: false, error: "Cannot suspend the last active Super Admin." };
      }
    }

    const result = await this.accessRepo.setAccountStatus(input.employeeId, input.status);

    return {
      ok: true,
      data: result,
    };
  }

  /**
   * Reset an employee's credentials
   */
  async resetPassword(
    actor: ActorContext,
    input: ResetPasswordInput
  ): Promise<{ ok: true; data: { employee: Employee; message: string } } | { ok: false; error: string }> {
    const target = await this.accessRepo.findEmployeeById(input.employeeId);
    if (!target) {
      return { ok: false, error: "Employee not found." };
    }

    const result = await this.accessRepo.resetPassword(input.employeeId, "demo1234");

    return {
      ok: true,
      data: {
        employee: result.employee,
        message: `Password for ${target.firstName} ${target.lastName} reset to default demo password.`,
      },
    };
  }
}

export const accessService = new AccessService();

