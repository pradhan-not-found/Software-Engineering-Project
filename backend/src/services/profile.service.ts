// backend/src/services/profile.service.ts
// Layer 3: Domain Service for Employee Profile & Self-Service

import { profileRepository, ProfileRepository } from "../repositories/profile.repository";
import { notificationRepository } from "../repositories/notification.repository";
import type { Employee, EmployeeDocument, Role } from "../types";
import {
  type UpdateProfileInput,
  type ChangePasswordInput,
  type UploadDocumentInput,
  validateUpdateProfileInput,
  validateChangePasswordInput,
  validateUploadDocumentInput,
} from "../validations/profile.schema";

export interface CurrentUserActor {
  id: string;
  role: Role;
  firstName?: string;
  lastName?: string;
}

export interface ProfileViewPayload {
  employee: Omit<Employee, "password">;
  managerChain: Omit<Employee, "password">[];
  directReports: Omit<Employee, "password">[];
}

export class ProfileService {
  constructor(private repo: ProfileRepository = profileRepository) {}

  private sanitize(e: Employee): Omit<Employee, "password"> {
    const { password, ...safe } = e;
    return safe;
  }

  /**
   * Retrieves current user's profile, reporting chain, and direct reports
   */
  async getProfile(
    actor: CurrentUserActor
  ): Promise<{ ok: true; data: ProfileViewPayload } | { ok: false; error: string }> {
    const emp = await this.repo.getProfile(actor.id);
    if (!emp) {
      return { ok: false, error: "Employee profile not found." };
    }

    const chain = await this.repo.getManagerChain(actor.id);
    const reports = await this.repo.getDirectReports(actor.id);

    return {
      ok: true,
      data: {
        employee: this.sanitize(emp),
        managerChain: chain.map((m) => this.sanitize(m)),
        directReports: reports.map((r) => this.sanitize(r)),
      },
    };
  }

  /**
   * Updates allowed self-service personal information
   */
  async updateProfile(
    actor: CurrentUserActor,
    rawInput: any
  ): Promise<{ ok: true; data: Omit<Employee, "password"> } | { ok: false; error: string }> {
    const validation = validateUpdateProfileInput(rawInput);
    if (!validation.ok) {
      return { ok: false, error: validation.error };
    }

    const emp = await this.repo.getProfile(actor.id);
    if (!emp) {
      return { ok: false, error: "Employee not found." };
    }

    if (emp.status === "TERMINATED" || emp.accountStatus === "SUSPENDED") {
      return { ok: false, error: "Inactive or terminated accounts cannot modify profile details." };
    }

    const updated = await this.repo.updatePersonalInfo(actor.id, validation.data);
    if (!updated) {
      return { ok: false, error: "Failed to update profile details." };
    }

    // Connected Wedge: Audit logging
    await notificationRepository.createActivityLog({
      actorId: actor.id,
      action: "UPDATE",
      entity: "Employee",
      message: `${actor.firstName ?? "User"} updated their personal profile details.`,
      category: "HR",
    });

    return {
      ok: true,
      data: this.sanitize(updated),
    };
  }

  /**
   * Authenticates current password and updates to new password
   */
  async changePassword(
    actor: CurrentUserActor,
    rawInput: any
  ): Promise<{ ok: true; data: { message: string } } | { ok: false; error: string }> {
    const validation = validateChangePasswordInput(rawInput);
    if (!validation.ok) {
      return { ok: false, error: validation.error };
    }

    const isValid = await this.repo.verifyPassword(actor.id, validation.data.currentPassword);
    if (!isValid) {
      return { ok: false, error: "Current password is incorrect." };
    }

    const success = await this.repo.updatePassword(actor.id, validation.data.newPassword);
    if (!success) {
      return { ok: false, error: "Failed to update password." };
    }

    // Connected Wedge: Security audit log
    await notificationRepository.createActivityLog({
      actorId: actor.id,
      action: "UPDATE",
      entity: "User",
      message: `${actor.firstName ?? "User"} changed their account password.`,
      category: "SYSTEM",
    });

    return {
      ok: true,
      data: { message: "Password updated successfully." },
    };
  }

  /**
   * Uploads an employee document (starts in unverified status)
   */
  async uploadDocument(
    actor: CurrentUserActor,
    rawInput: any
  ): Promise<{ ok: true; data: EmployeeDocument } | { ok: false; error: string }> {
    const validation = validateUploadDocumentInput(rawInput);
    if (!validation.ok) {
      return { ok: false, error: validation.error };
    }

    const doc = await this.repo.addDocument(actor.id, validation.data);
    if (!doc) {
      return { ok: false, error: "Failed to upload document." };
    }

    // Connected Wedge: Audit log & notification
    await notificationRepository.createActivityLog({
      actorId: actor.id,
      action: "CREATE",
      entity: "Document",
      message: `${actor.firstName ?? "User"} uploaded ${doc.name} (${doc.type}) for verification.`,
      category: "HR",
    });

    return {
      ok: true,
      data: doc,
    };
  }

  /**
   * Toggles an onboarding document checklist item
   */
  async toggleOnboardingDoc(
    actor: CurrentUserActor,
    docId: string
  ): Promise<{ ok: true; data: { docId: string } } | { ok: false; error: string }> {
    if (!docId || typeof docId !== "string") {
      return { ok: false, error: "Document ID is required." };
    }

    const ok = await this.repo.toggleOnboardingDoc(actor.id, docId);
    if (!ok) {
      return { ok: false, error: "Failed to toggle onboarding document." };
    }

    return {
      ok: true,
      data: { docId },
    };
  }
}

export const profileService = new ProfileService();
