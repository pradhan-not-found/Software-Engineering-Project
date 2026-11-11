// backend/src/validations/performance.schema.ts
// Validation schemas for Performance Cycles, Reviews, Peer Feedback & Goals (OKRs/KPIs)

import type { Goal, ReviewCycle, Review } from "../types";
import type { ValidationResult } from "./auth.schema";

export interface ReviewCycleCreateInput {
  name: string;
  startDate: string;
  endDate: string;
}

export interface ReviewSubmitInput {
  rating: number; // 1 to 5
  comment?: string;
}

export interface PeerFeedbackInput {
  rating: number; // 1 to 5
  comment: string;
}

export interface GoalCreateInput {
  employeeId?: string;
  title: string;
  type: "OKR" | "KPI";
  quarter: string;
  progress?: number;
  status?: "ON_TRACK" | "AT_RISK" | "BEHIND" | "COMPLETED";
  keyResults?: { id?: string; label?: string; text?: string; done: boolean }[];
}

export interface GoalUpdateInput {
  title?: string;
  type?: "OKR" | "KPI";
  quarter?: string;
  progress?: number;
  status?: "ON_TRACK" | "AT_RISK" | "BEHIND" | "COMPLETED";
  keyResults?: { id?: string; label?: string; text?: string; done: boolean }[];
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates review cycle creation payload
 */
export function validateReviewCycleCreateInput(body: unknown): ValidationResult<ReviewCycleCreateInput> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid JSON request payload." };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.name !== "string" || b.name.trim().length < 2) {
    return { ok: false, error: "Review cycle name must be at least 2 characters." };
  }

  if (typeof b.startDate !== "string" || !DATE_REGEX.test(b.startDate)) {
    return { ok: false, error: "Valid start date (YYYY-MM-DD) is required." };
  }

  if (typeof b.endDate !== "string" || !DATE_REGEX.test(b.endDate)) {
    return { ok: false, error: "Valid end date (YYYY-MM-DD) is required." };
  }

  if (b.endDate < b.startDate) {
    return { ok: false, error: "End date must be on or after start date." };
  }

  return {
    ok: true,
    data: {
      name: b.name.trim(),
      startDate: b.startDate,
      endDate: b.endDate,
    },
  };
}

/**
 * Validates self or manager review submission payload
 */
export function validateReviewSubmitInput(body: unknown): ValidationResult<ReviewSubmitInput> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid JSON request payload." };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.rating !== "number" || !Number.isInteger(b.rating) || b.rating < 1 || b.rating > 5) {
    return { ok: false, error: "Rating must be an integer between 1 and 5." };
  }

  const comment = typeof b.comment === "string" ? b.comment.trim() : "";

  return {
    ok: true,
    data: {
      rating: b.rating,
      comment,
    },
  };
}

/**
 * Validates peer feedback submission payload
 */
export function validatePeerFeedbackInput(body: unknown): ValidationResult<PeerFeedbackInput> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid JSON request payload." };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.rating !== "number" || !Number.isInteger(b.rating) || b.rating < 1 || b.rating > 5) {
    return { ok: false, error: "Rating must be an integer between 1 and 5." };
  }

  if (typeof b.comment !== "string" || b.comment.trim().length < 2) {
    return { ok: false, error: "Peer feedback comment must be at least 2 characters." };
  }

  return {
    ok: true,
    data: {
      rating: b.rating,
      comment: b.comment.trim(),
    },
  };
}

/**
 * Validates goal creation payload
 */
export function validateGoalCreateInput(body: unknown): ValidationResult<GoalCreateInput> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid JSON request payload." };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.title !== "string" || b.title.trim().length < 2) {
    return { ok: false, error: "Goal title must be at least 2 characters." };
  }

  if (b.type !== "OKR" && b.type !== "KPI") {
    return { ok: false, error: "Goal type must be either 'OKR' or 'KPI'." };
  }

  if (typeof b.quarter !== "string" || !b.quarter.trim()) {
    return { ok: false, error: "Quarter string is required (e.g. 'Q1 2027')." };
  }

  let progress = 0;
  if (typeof b.progress === "number") {
    if (b.progress < 0 || b.progress > 100) {
      return { ok: false, error: "Progress must be a percentage between 0 and 100." };
    }
    progress = Math.round(b.progress);
  }

  let status: GoalCreateInput["status"] = "ON_TRACK";
  if (b.status) {
    const validStatuses = ["ON_TRACK", "AT_RISK", "BEHIND", "COMPLETED"];
    if (!validStatuses.includes(b.status as string)) {
      return { ok: false, error: "Invalid goal status." };
    }
    status = b.status as GoalCreateInput["status"];
  }

  let keyResults: GoalCreateInput["keyResults"] = [];
  if (Array.isArray(b.keyResults)) {
    keyResults = b.keyResults.map((kr: any, i: number) => {
      const label = typeof kr.label === "string" ? kr.label.trim() : typeof kr.text === "string" ? kr.text.trim() : "";
      return {
        id: typeof kr.id === "string" ? kr.id : `kr_${i + 1}`,
        label,
        text: label,
        done: Boolean(kr.done),
      };
    });
  }

  return {
    ok: true,
    data: {
      employeeId: typeof b.employeeId === "string" ? b.employeeId : undefined,
      title: b.title.trim(),
      type: b.type,
      quarter: b.quarter.trim(),
      progress,
      status,
      keyResults,
    },
  };
}

/**
 * Validates goal update payload
 */
export function validateGoalUpdateInput(body: unknown): ValidationResult<GoalUpdateInput> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid JSON request payload." };
  }

  const b = body as Record<string, unknown>;
  const patch: GoalUpdateInput = {};

  if (b.title !== undefined) {
    if (typeof b.title !== "string" || b.title.trim().length < 2) {
      return { ok: false, error: "Goal title must be at least 2 characters." };
    }
    patch.title = b.title.trim();
  }

  if (b.type !== undefined) {
    if (b.type !== "OKR" && b.type !== "KPI") {
      return { ok: false, error: "Goal type must be either 'OKR' or 'KPI'." };
    }
    patch.type = b.type;
  }

  if (b.quarter !== undefined) {
    if (typeof b.quarter !== "string" || !b.quarter.trim()) {
      return { ok: false, error: "Quarter string cannot be empty." };
    }
    patch.quarter = b.quarter.trim();
  }

  if (b.progress !== undefined) {
    if (typeof b.progress !== "number" || b.progress < 0 || b.progress > 100) {
      return { ok: false, error: "Progress must be a percentage between 0 and 100." };
    }
    patch.progress = Math.round(b.progress);
  }

  if (b.status !== undefined) {
    const validStatuses = ["ON_TRACK", "AT_RISK", "BEHIND", "COMPLETED"];
    if (!validStatuses.includes(b.status as string)) {
      return { ok: false, error: "Invalid goal status." };
    }
    patch.status = b.status as GoalUpdateInput["status"];
  }

  if (b.keyResults !== undefined) {
    if (!Array.isArray(b.keyResults)) {
      return { ok: false, error: "Key results must be an array." };
    }
    patch.keyResults = b.keyResults.map((kr: any, i: number) => {
      const label = typeof kr.label === "string" ? kr.label.trim() : typeof kr.text === "string" ? kr.text.trim() : "";
      return {
        id: typeof kr.id === "string" ? kr.id : `kr_${i + 1}`,
        label,
        text: label,
        done: Boolean(kr.done),
      };
    });
  }

  return {
    ok: true,
    data: patch,
  };
}
