// frontend/src/lib/validations/notification.schema.ts
// Layer 1: Validation Schemas for Page 13 (Notifications & Activity Log)

import type { NotificationCategory } from "../types";

export interface NotificationFilterInput {
  category?: NotificationCategory | "ALL";
  unreadOnly?: boolean;
}

export interface ActivityFilterInput {
  category?: NotificationCategory | "ALL";
  entity?: string;
  query?: string;
}

export interface CreateNotificationInput {
  recipientId: string;
  title: string;
  message: string;
  category: NotificationCategory;
  link?: string | null;
}

export interface CreateActivityInput {
  actorId?: string | null;
  action: "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT" | "SYSTEM";
  entity: string;
  message: string;
  category: NotificationCategory;
}

export function validateNotificationFilter(input: any): { ok: true; data: NotificationFilterInput } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: true, data: {} };
  }

  const validCategories = ["HR", "WORK", "SYSTEM", "ALL"];
  if (input.category && !validCategories.includes(input.category)) {
    return { ok: false, error: `Invalid category: ${input.category}. Allowed: ${validCategories.join(", ")}` };
  }

  return {
    ok: true,
    data: {
      category: input.category,
      unreadOnly: Boolean(input.unreadOnly),
    },
  };
}

export function validateActivityFilter(input: any): { ok: true; data: ActivityFilterInput } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: true, data: {} };
  }

  const validCategories = ["HR", "WORK", "SYSTEM", "ALL"];
  if (input.category && !validCategories.includes(input.category)) {
    return { ok: false, error: `Invalid category: ${input.category}. Allowed: ${validCategories.join(", ")}` };
  }

  return {
    ok: true,
    data: {
      category: input.category,
      entity: typeof input.entity === "string" ? input.entity.trim() : undefined,
      query: typeof input.query === "string" ? input.query.trim() : undefined,
    },
  };
}

export function validateCreateNotificationInput(input: any): { ok: true; data: CreateNotificationInput } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Notification payload is required." };
  }

  if (!input.recipientId || typeof input.recipientId !== "string" || !input.recipientId.trim()) {
    return { ok: false, error: "Recipient ID is required." };
  }

  if (!input.title || typeof input.title !== "string" || input.title.trim().length < 2) {
    return { ok: false, error: "Notification title must be at least 2 characters." };
  }

  if (!input.message || typeof input.message !== "string" || input.message.trim().length < 2) {
    return { ok: false, error: "Notification message must be at least 2 characters." };
  }

  const validCategories: NotificationCategory[] = ["HR", "WORK", "SYSTEM"];
  if (!input.category || !validCategories.includes(input.category)) {
    return { ok: false, error: `Category must be one of: ${validCategories.join(", ")}` };
  }

  return {
    ok: true,
    data: {
      recipientId: input.recipientId.trim(),
      title: input.title.trim(),
      message: input.message.trim(),
      category: input.category,
      link: typeof input.link === "string" ? input.link.trim() : null,
    },
  };
}

export function validateCreateActivityInput(input: any): { ok: true; data: CreateActivityInput } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Activity log payload is required." };
  }

  const validActions = ["CREATE", "UPDATE", "DELETE", "APPROVE", "REJECT", "SYSTEM"];
  if (!input.action || !validActions.includes(input.action)) {
    return { ok: false, error: `Action must be one of: ${validActions.join(", ")}` };
  }

  if (!input.entity || typeof input.entity !== "string" || !input.entity.trim()) {
    return { ok: false, error: "Entity name is required." };
  }

  if (!input.message || typeof input.message !== "string" || input.message.trim().length < 2) {
    return { ok: false, error: "Activity message must be at least 2 characters." };
  }

  const validCategories: NotificationCategory[] = ["HR", "WORK", "SYSTEM"];
  if (!input.category || !validCategories.includes(input.category)) {
    return { ok: false, error: `Category must be one of: ${validCategories.join(", ")}` };
  }

  return {
    ok: true,
    data: {
      actorId: typeof input.actorId === "string" && input.actorId.trim() ? input.actorId.trim() : null,
      action: input.action,
      entity: input.entity.trim(),
      message: input.message.trim(),
      category: input.category,
    },
  };
}
