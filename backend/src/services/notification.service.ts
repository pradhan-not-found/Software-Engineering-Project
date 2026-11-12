// backend/src/services/notification.service.ts
// Layer 3: Domain Service for Notifications, Inboxes, and Organization Audit Logs

import { notificationRepository, NotificationRepository } from "../repositories/notification.repository";
import { employeeRepository } from "../repositories/employee.repository";
import type { ActivityLog, Notification, NotificationCategory, Role } from "../types";
import {
  type NotificationFilterInput,
  type ActivityFilterInput,
  type CreateNotificationInput,
  type CreateActivityInput,
  validateNotificationFilter,
  validateActivityFilter,
  validateCreateNotificationInput,
  validateCreateActivityInput,
} from "../validations/notification.schema";

export interface CurrentUserActor {
  id: string;
  role: Role;
  firstName?: string;
  lastName?: string;
}

export interface InboxSummary {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  categories: {
    HR: number;
    WORK: number;
    SYSTEM: number;
  };
}

export interface AuditLogSummary {
  logs: (ActivityLog & { actorName?: string })[];
  total: number;
  entities: string[];
}

export class NotificationService {
  constructor(private repo: NotificationRepository = notificationRepository) {}

  private isAdminRole(role: Role): boolean {
    return role === "SUPER_ADMIN" || role === "HR_ADMIN";
  }

  /**
   * Retrieves user's notification inbox with unread counts and category summaries
   */
  async getInbox(
    actor: CurrentUserActor,
    rawFilter?: any
  ): Promise<{ ok: true; data: InboxSummary } | { ok: false; error: string }> {
    const filterValidation = validateNotificationFilter(rawFilter);
    if (!filterValidation.ok) {
      return { ok: false, error: filterValidation.error };
    }

    const filter = filterValidation.data;
    const allNotifications = await this.repo.getNotifications(actor.id);
    const filtered = await this.repo.getNotifications(actor.id, filter);
    const unreadCount = await this.repo.getUnreadCount(actor.id);

    const categories = {
      HR: allNotifications.filter((n) => n.category === "HR").length,
      WORK: allNotifications.filter((n) => n.category === "WORK").length,
      SYSTEM: allNotifications.filter((n) => n.category === "SYSTEM").length,
    };

    return {
      ok: true,
      data: {
        notifications: filtered,
        total: allNotifications.length,
        unreadCount,
        categories,
      },
    };
  }

  /**
   * Marks a specific notification as read, enforcing user ownership
   */
  async markNotificationRead(
    actor: CurrentUserActor,
    notificationId: string
  ): Promise<{ ok: true; data: { id: string; read: boolean } } | { ok: false; error: string }> {
    if (!notificationId || typeof notificationId !== "string") {
      return { ok: false, error: "Notification ID is required." };
    }

    const success = await this.repo.markAsRead(notificationId, actor.id);
    if (!success) {
      return { ok: false, error: "Notification not found or access denied." };
    }

    return {
      ok: true,
      data: { id: notificationId, read: true },
    };
  }

  /**
   * Marks all notifications for current user as read
   */
  async markAllNotificationsRead(
    actor: CurrentUserActor
  ): Promise<{ ok: true; data: { markedCount: number } } | { ok: false; error: string }> {
    const count = await this.repo.markAllAsRead(actor.id);
    return {
      ok: true,
      data: { markedCount: count },
    };
  }

  /**
   * Clears (deletes) all notifications for current user
   */
  async clearUserNotifications(
    actor: CurrentUserActor
  ): Promise<{ ok: true; data: { clearedCount: number } } | { ok: false; error: string }> {
    const count = await this.repo.clearNotifications(actor.id);
    return {
      ok: true,
      data: { clearedCount: count },
    };
  }

  /**
   * Retrieves organization activity audit logs (Admin RBAC enforced)
   */
  async getAuditLog(
    actor: CurrentUserActor,
    rawFilter?: any
  ): Promise<{ ok: true; data: AuditLogSummary } | { ok: false; error: string }> {
    if (!this.isAdminRole(actor.role)) {
      return { ok: false, error: "Only administrators can access the organization audit log." };
    }

    const filterValidation = validateActivityFilter(rawFilter);
    if (!filterValidation.ok) {
      return { ok: false, error: filterValidation.error };
    }

    const filter = filterValidation.data;
    const rawLogs = await this.repo.getActivityLogs(filter);
    const allLogs = await this.repo.getActivityLogs();

    const entities = Array.from(new Set(allLogs.map((a) => a.entity))).sort();

    // Enrich logs with actor names
    const enriched = await Promise.all(
      rawLogs.map(async (log) => {
        let actorName = "System";
        if (log.actorId) {
          const emp = await employeeRepository.findById(log.actorId);
          if (emp) {
            actorName = `${emp.firstName} ${emp.lastName}`.trim();
          }
        }
        return {
          ...log,
          actorName,
        };
      })
    );

    return {
      ok: true,
      data: {
        logs: enriched,
        total: allLogs.length,
        entities,
      },
    };
  }

  /**
   * Exports organization audit logs as RFC 4180 compliant CSV (Admin RBAC enforced)
   */
  async exportAuditCSV(
    actor: CurrentUserActor,
    rawFilter?: any
  ): Promise<{ ok: true; data: { csv: string; filename: string } } | { ok: false; error: string }> {
    if (!this.isAdminRole(actor.role)) {
      return { ok: false, error: "Only administrators can export organization audit logs." };
    }

    const result = await this.getAuditLog(actor, rawFilter);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const headers = ["Timestamp", "Actor", "Action", "Entity", "Category", "Message"];
    const rows = result.data.logs.map((log) => [
      log.at,
      log.actorName || "System",
      log.action,
      log.entity,
      log.category,
      log.message,
    ]);

    const csvContent = [headers.map(escapeCsv).join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n");

    return {
      ok: true,
      data: {
        csv: csvContent,
        filename: `audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
      },
    };
  }

  /**
   * Programmatically sends a notification to a user (Cross-module Connected Wedge utility)
   */
  async sendNotification(
    input: any
  ): Promise<{ ok: true; data: Notification } | { ok: false; error: string }> {
    const validation = validateCreateNotificationInput(input);
    if (!validation.ok) {
      return { ok: false, error: validation.error };
    }

    const notif = await this.repo.createNotification(validation.data);
    return { ok: true, data: notif };
  }

  /**
   * Programmatically logs an organization activity (Cross-module Connected Wedge utility)
   */
  async logActivity(
    input: any
  ): Promise<{ ok: true; data: ActivityLog } | { ok: false; error: string }> {
    const validation = validateCreateActivityInput(input);
    if (!validation.ok) {
      return { ok: false, error: validation.error };
    }

    const act = await this.repo.createActivityLog(validation.data);
    return { ok: true, data: act };
  }
}

export const notificationService = new NotificationService();
