// frontend/src/lib/validations/project.schema.ts
// Validation schemas for projects and boards

import type { Project } from "@/lib/types";

export interface ProjectCreateInput {
  name: string;
  description?: string;
  color?: string;
  leadId: string;
  departmentId?: string;
  status: Project["status"];
  startDate?: string;
  endDate?: string;
}

export interface ProjectPatchInput {
  name?: string;
  description?: string;
  color?: string;
  leadId?: string;
  departmentId?: string;
  status?: Project["status"];
  startDate?: string;
  endDate?: string;
}

export function validateProjectCreateInput(body: unknown): { ok: true; data: ProjectCreateInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request payload." };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.name !== "string" || !b.name.trim()) {
    return { ok: false, error: "Project name is required." };
  }

  if (typeof b.leadId !== "string" || !b.leadId.trim()) {
    return { ok: false, error: "Project lead is required." };
  }

  const validStatuses: Project["status"][] = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED"];
  const status = (typeof b.status === "string" && validStatuses.includes(b.status as Project["status"]))
    ? (b.status as Project["status"])
    : "ACTIVE";

  const todayStr = new Date().toISOString().slice(0, 10);
  const futureStr = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

  return {
    ok: true,
    data: {
      name: b.name.trim(),
      description: typeof b.description === "string" ? b.description.trim() : "",
      color: typeof b.color === "string" && b.color.trim() ? b.color.trim() : "blue",
      leadId: b.leadId.trim(),
      departmentId: typeof b.departmentId === "string" && b.departmentId.trim() ? b.departmentId.trim() : undefined,
      status,
      startDate: typeof b.startDate === "string" && b.startDate.trim() ? b.startDate.trim() : todayStr,
      endDate: typeof b.endDate === "string" && b.endDate.trim() ? b.endDate.trim() : futureStr,
    },
  };
}

export function validateProjectPatchInput(body: unknown): { ok: true; data: ProjectPatchInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid patch payload." };
  }

  const b = body as Record<string, unknown>;
  const data: ProjectPatchInput = {};

  if (typeof b.name === "string" && b.name.trim()) data.name = b.name.trim();
  if (typeof b.description === "string") data.description = b.description.trim();
  if (typeof b.color === "string" && b.color.trim()) data.color = b.color.trim();
  if (typeof b.leadId === "string" && b.leadId.trim()) data.leadId = b.leadId.trim();
  if (typeof b.departmentId === "string" && b.departmentId.trim()) data.departmentId = b.departmentId.trim();

  const validStatuses: Project["status"][] = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED"];
  if (typeof b.status === "string" && validStatuses.includes(b.status as Project["status"])) {
    data.status = b.status as Project["status"];
  }

  if (typeof b.startDate === "string" && b.startDate.trim()) data.startDate = b.startDate.trim();
  if (typeof b.endDate === "string" && b.endDate.trim()) data.endDate = b.endDate.trim();

  return { ok: true, data };
}
