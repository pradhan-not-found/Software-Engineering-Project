/**
 * Organization Settings & Holiday Calendar Domain Service
 * Layer 3: Service Layer
 */

import type { Role, OrgSettings, Department, Holiday } from "../types";
import {
  settingsRepository,
  SettingsRepository,
  DepartmentWithDetails,
} from "../repositories/settings.repository";
import type {
  UpdateOrgInput,
  CreateDepartmentInput,
  CreateHolidayInput,
} from "../validations/settings.schema";

export interface ActorContext {
  id: string;
  role: Role;
  firstName?: string;
  lastName?: string;
}

export interface SettingsOverviewResult {
  org: OrgSettings;
  departments: DepartmentWithDetails[];
  holidays: Holiday[];
  year: number;
}

export class SettingsService {
  constructor(private settingsRepo: SettingsRepository = settingsRepository) {}

  /**
   * Fetch complete workspace settings overview
   */
  async getSettingsOverview(
    actor: ActorContext
  ): Promise<{ ok: true; data: SettingsOverviewResult } | { ok: false; error: string }> {
    const year = new Date().getFullYear();
    const [org, departments, holidays] = await Promise.all([
      this.settingsRepo.getOrgSettings(),
      this.settingsRepo.getDepartments(),
      this.settingsRepo.getHolidays(year),
    ]);

    return {
      ok: true,
      data: {
        org,
        departments,
        holidays,
        year,
      },
    };
  }

  /**
   * Update Organization Settings
   * Security Invariant: Only SUPER_ADMIN and HR_ADMIN can modify workspace settings.
   */
  async updateOrg(
    actor: ActorContext,
    patch: UpdateOrgInput
  ): Promise<{ ok: true; data: OrgSettings } | { ok: false; error: string }> {
    if (actor.role !== "SUPER_ADMIN" && actor.role !== "HR_ADMIN") {
      return { ok: false, error: "Only an Administrator can update organization settings." };
    }

    const updated = await this.settingsRepo.updateOrgSettings(patch);
    return { ok: true, data: updated };
  }

  /**
   * Create Department
   * Security Invariant: Unique department code check and Admin permissions.
   */
  async createDepartment(
    actor: ActorContext,
    input: CreateDepartmentInput
  ): Promise<{ ok: true; data: Department } | { ok: false; error: string }> {
    if (actor.role !== "SUPER_ADMIN" && actor.role !== "HR_ADMIN") {
      return { ok: false, error: "Only an Administrator can create departments." };
    }

    const existing = await this.settingsRepo.findDepartmentByCode(input.code);
    if (existing) {
      return { ok: false, error: "Department code already exists." };
    }

    const created = await this.settingsRepo.createDepartment({
      name: input.name,
      code: input.code,
      color: input.color || "blue",
      headId: input.headId || null,
    });

    return { ok: true, data: created };
  }

  /**
   * Create Holiday & Trigger Cross-Domain Employee Notifications
   * Security Invariant: Duplicate date prevention and Admin permissions.
   */
  async createHoliday(
    actor: ActorContext,
    input: CreateHolidayInput
  ): Promise<{ ok: true; data: Holiday } | { ok: false; error: string }> {
    if (actor.role !== "SUPER_ADMIN" && actor.role !== "HR_ADMIN") {
      return { ok: false, error: "Only an Administrator can add holidays." };
    }

    const existing = await this.settingsRepo.findHolidayByDate(input.date);
    if (existing) {
      return { ok: false, error: "A holiday already exists on that date." };
    }

    const created = await this.settingsRepo.createHoliday({
      date: input.date,
      name: input.name,
      type: input.type,
    });

    return { ok: true, data: created };
  }

  /**
   * Delete Holiday
   */
  async deleteHoliday(
    actor: ActorContext,
    id: string
  ): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
    if (actor.role !== "SUPER_ADMIN" && actor.role !== "HR_ADMIN") {
      return { ok: false, error: "Only an Administrator can remove holidays." };
    }

    const success = await this.settingsRepo.deleteHoliday(id);
    if (!success) {
      return { ok: false, error: "Holiday not found." };
    }

    return { ok: true, message: "Holiday removed." };
  }

  /**
   * Reset Demo Organization Data
   * Security Invariant: Only SUPER_ADMIN can trigger full data reset.
   */
  async resetDemo(
    actor: ActorContext
  ): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
    if (actor.role !== "SUPER_ADMIN") {
      return { ok: false, error: "Only a Super Admin can reset demo data." };
    }

    await this.settingsRepo.resetDemoData();
    return { ok: true, message: "Demo data restored successfully." };
  }
}

export const settingsService = new SettingsService();

