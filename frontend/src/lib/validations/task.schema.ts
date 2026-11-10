// frontend/src/lib/validations/task.schema.ts
// Validation schemas for tasks, boards, and comments

import type { Priority, Recurrence, TaskFlag } from "@/lib/types";

export interface TaskCreateInput {
  boardId: string;
  columnId?: string;
  title: string;
  description?: string;
  priority: Priority;
  dueDate?: string | null;
  assigneeIds: string[];
  recurrence?: Recurrence;
  tags?: string[];
}

export interface TaskPatchInput {
  title?: string;
  description?: string;
  columnId?: string;
  priority?: Priority;
  dueDate?: string | null;
  assigneeIds?: string[];
  flag?: TaskFlag;
  order?: number;
  completedAt?: string | null;
}

export interface CommentInput {
  text: string;
}

export function validateTaskCreateInput(body: unknown): { ok: true; data: TaskCreateInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request payload." };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.title !== "string" || !b.title.trim()) {
    return { ok: false, error: "Task title is required." };
  }

  if (typeof b.boardId !== "string" || !b.boardId.trim()) {
    return { ok: false, error: "Target board is required." };
  }

  const validPriorities: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
  const priority = (typeof b.priority === "string" && validPriorities.includes(b.priority as Priority))
    ? (b.priority as Priority)
    : "MEDIUM";

  const validRecurrence: Recurrence[] = ["NONE", "DAILY", "WEEKLY"];
  const recurrence = (typeof b.recurrence === "string" && validRecurrence.includes(b.recurrence as Recurrence))
    ? (b.recurrence as Recurrence)
    : "NONE";

  const assigneeIds = Array.isArray(b.assigneeIds)
    ? b.assigneeIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];

  const tags = Array.isArray(b.tags)
    ? b.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
    : [];

  return {
    ok: true,
    data: {
      title: b.title.trim(),
      boardId: b.boardId.trim(),
      columnId: typeof b.columnId === "string" ? b.columnId.trim() : undefined,
      description: typeof b.description === "string" ? b.description.trim() : "",
      priority,
      dueDate: typeof b.dueDate === "string" && b.dueDate.trim() ? b.dueDate.trim() : null,
      assigneeIds,
      recurrence,
      tags,
    },
  };
}

export function validateTaskPatchInput(body: unknown): { ok: true; data: TaskPatchInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request payload." };
  }

  const b = body as Record<string, unknown>;
  const patch: TaskPatchInput = {};

  if (typeof b.title === "string") {
    if (!b.title.trim()) return { ok: false, error: "Task title cannot be empty." };
    patch.title = b.title.trim();
  }

  if (typeof b.description === "string") {
    patch.description = b.description.trim();
  }

  if (typeof b.columnId === "string") {
    patch.columnId = b.columnId.trim();
  }

  if (typeof b.priority === "string") {
    const validPriorities: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    if (validPriorities.includes(b.priority as Priority)) {
      patch.priority = b.priority as Priority;
    }
  }

  if (b.dueDate !== undefined) {
    patch.dueDate = typeof b.dueDate === "string" && b.dueDate.trim() ? b.dueDate.trim() : null;
  }

  if (Array.isArray(b.assigneeIds)) {
    patch.assigneeIds = b.assigneeIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
  }

  if (typeof b.flag === "string") {
    if (["NORMAL", "DELAYED_ON_LEAVE", "BLOCKED"].includes(b.flag)) {
      patch.flag = b.flag as TaskFlag;
    }
  }

  if (typeof b.order === "number") {
    patch.order = b.order;
  }

  if (b.completedAt !== undefined) {
    patch.completedAt = typeof b.completedAt === "string" ? b.completedAt : null;
  }

  return { ok: true, data: patch };
}

export function validateCommentInput(body: unknown): { ok: true; data: CommentInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request payload." };
  }

  const b = body as Record<string, unknown>;
  if (typeof b.text !== "string" || !b.text.trim()) {
    return { ok: false, error: "Comment text cannot be empty." };
  }

  return {
    ok: true,
    data: { text: b.text.trim() },
  };
}
