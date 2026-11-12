// backend/src/repositories/notification.repository.ts
// Layer 2: Repository Data Access for Notifications & Activity Audit Trail

import { seed } from "../seed";
import type { ActivityLog, Notification, NotificationCategory } from "../types";
import type { NotificationFilterInput, ActivityFilterInput } from "../validations/notification.schema";

export class NotificationRepository {
  /**
   * Retrieves all notifications for a specific recipient, with optional category & unread filters
   */
  async getNotifications(recipientId: string, filter?: NotificationFilterInput): Promise<Notification[]> {
    let items = (seed.notifications || []).filter((n) => n.recipientId === recipientId);

    if (filter?.category && filter.category !== "ALL") {
      items = items.filter((n) => n.category === filter.category);
    }

    if (filter?.unreadOnly) {
      items = items.filter((n) => !n.read);
    }

    // Sort descending by creation date
    return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Returns count of unread notifications for a recipient
   */
  async getUnreadCount(recipientId: string): Promise<number> {
    return (seed.notifications || []).filter((n) => n.recipientId === recipientId && !n.read).length;
  }

  /**
   * Finds a specific notification by ID
   */
  async findById(id: string): Promise<Notification | null> {
    const item = (seed.notifications || []).find((n) => n.id === id);
    return item ? { ...item } : null;
  }

  /**
   * Marks a single notification as read (ensuring ownership)
   */
  async markAsRead(id: string, recipientId: string): Promise<boolean> {
    const item = (seed.notifications || []).find((n) => n.id === id && n.recipientId === recipientId);
    if (!item) return false;
    item.read = true;
    return true;
  }

  /**
   * Marks all notifications as read for a recipient
   */
  async markAllAsRead(recipientId: string): Promise<number> {
    let count = 0;
    (seed.notifications || []).forEach((n) => {
      if (n.recipientId === recipientId && !n.read) {
        n.read = true;
        count++;
      }
    });
    return count;
  }

  /**
   * Clears (deletes) all notifications for a recipient
   */
  async clearNotifications(recipientId: string): Promise<number> {
    const initialCount = (seed.notifications || []).length;
    seed.notifications = (seed.notifications || []).filter((n) => n.recipientId !== recipientId);
    return initialCount - seed.notifications.length;
  }

  /**
   * Creates and persists a new notification
   */
  async createNotification(data: {
    recipientId: string;
    title: string;
    message: string;
    category: NotificationCategory;
    link?: string | null;
  }): Promise<Notification> {
    const newNotif: Notification = {
      id: `n_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      recipientId: data.recipientId,
      title: data.title,
      message: data.message,
      category: data.category,
      read: false,
      link: data.link ?? null,
      createdAt: new Date().toISOString(),
    };

    if (!seed.notifications) {
      seed.notifications = [];
    }
    seed.notifications.unshift(newNotif);
    return { ...newNotif };
  }

  /**
   * Retrieves organization activity audit logs with filtering
   */
  async getActivityLogs(filter?: ActivityFilterInput): Promise<ActivityLog[]> {
    let items = seed.activity || [];

    if (filter?.category && filter.category !== "ALL") {
      items = items.filter((a) => a.category === filter.category);
    }

    if (filter?.entity) {
      items = items.filter((a) => a.entity.toLowerCase() === filter.entity!.toLowerCase());
    }

    if (filter?.query) {
      const q = filter.query.toLowerCase();
      items = items.filter((a) => a.message.toLowerCase().includes(q) || a.entity.toLowerCase().includes(q));
    }

    // Sort descending by timestamp
    return [...items].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }

  /**
   * Logs a new organization activity audit record
   */
  async createActivityLog(data: {
    actorId?: string | null;
    action: "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT" | "SYSTEM";
    entity: string;
    message: string;
    category: NotificationCategory;
  }): Promise<ActivityLog> {
    const newActivity: ActivityLog = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      actorId: data.actorId ?? null,
      action: data.action,
      entity: data.entity,
      message: data.message,
      category: data.category,
      at: new Date().toISOString(),
    };

    if (!seed.activity) {
      seed.activity = [];
    }
    seed.activity.unshift(newActivity);
    return { ...newActivity };
  }
}

export const notificationRepository = new NotificationRepository();

