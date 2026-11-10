// frontend/src/lib/validations/dashboard.schema.ts
// Validation schemas for Admin Overview Dashboard

export interface DashboardFilterInput {
  date?: string;
  category?: "ALL" | "HR" | "WORK" | "SYSTEM";
}

export function validateDashboardFilterInput(body: unknown): { ok: true; data: DashboardFilterInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: true, data: { category: "ALL" } };
  }

  const b = body as Record<string, unknown>;
  const validCategories = ["ALL", "HR", "WORK", "SYSTEM"];
  const category = (typeof b.category === "string" && validCategories.includes(b.category))
    ? (b.category as DashboardFilterInput["category"])
    : "ALL";

  const date = typeof b.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.date.trim())
    ? b.date.trim()
    : undefined;

  return {
    ok: true,
    data: {
      date,
      category,
    },
  };
}
