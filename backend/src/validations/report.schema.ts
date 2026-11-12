// backend/src/validations/report.schema.ts
// Validation schemas for Page 11: Reports & Executive Analytics Engine

export const VALID_PERIODS = ["7d", "30d", "90d", "ytd", "1y"] as const;
export type ReportPeriod = (typeof VALID_PERIODS)[number];

export const VALID_EXPORT_DATASETS = ["headcount", "attendance", "payroll", "leaves", "tasks"] as const;
export type ExportDataset = (typeof VALID_EXPORT_DATASETS)[number];

export const VALID_EXPORT_FORMATS = ["csv", "json"] as const;
export type ExportFormat = (typeof VALID_EXPORT_FORMATS)[number];

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export interface ReportFilterInput {
  period?: ReportPeriod;
  startDate?: string;
  endDate?: string;
  departmentId?: string;
}

export interface ExportReportInput {
  dataset: ExportDataset;
  format?: ExportFormat;
  departmentId?: string;
}

export function validateReportFilterInput(
  body: unknown
): { ok: true; data: ReportFilterInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: true, data: { period: "30d" } };
  }

  const b = body as Record<string, unknown>;
  const result: ReportFilterInput = {};

  if (b.period !== undefined && b.period !== null) {
    if (typeof b.period !== "string" || !VALID_PERIODS.includes(b.period as ReportPeriod)) {
      return {
        ok: false,
        error: `Invalid period. Must be one of: ${VALID_PERIODS.join(", ")}.`,
      };
    }
    result.period = b.period as ReportPeriod;
  } else {
    result.period = "30d";
  }

  if (b.startDate !== undefined && b.startDate !== null && b.startDate !== "") {
    if (typeof b.startDate !== "string" || !DATE_REGEX.test(b.startDate.trim())) {
      return { ok: false, error: "Start date must be formatted YYYY-MM-DD." };
    }
    result.startDate = b.startDate.trim();
  }

  if (b.endDate !== undefined && b.endDate !== null && b.endDate !== "") {
    if (typeof b.endDate !== "string" || !DATE_REGEX.test(b.endDate.trim())) {
      return { ok: false, error: "End date must be formatted YYYY-MM-DD." };
    }
    result.endDate = b.endDate.trim();
  }

  if (result.startDate && result.endDate && result.endDate < result.startDate) {
    return { ok: false, error: "End date must be on or after start date." };
  }

  if (typeof b.departmentId === "string" && b.departmentId.trim()) {
    result.departmentId = b.departmentId.trim();
  }

  return { ok: true, data: result };
}

export function validateExportReportInput(
  body: unknown
): { ok: true; data: ExportReportInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid export request payload." };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.dataset !== "string" || !VALID_EXPORT_DATASETS.includes(b.dataset as ExportDataset)) {
    return {
      ok: false,
      error: `Invalid dataset specified. Must be one of: ${VALID_EXPORT_DATASETS.join(", ")}.`,
    };
  }

  let format: ExportFormat = "csv";
  if (b.format !== undefined && b.format !== null) {
    if (typeof b.format !== "string" || !VALID_EXPORT_FORMATS.includes(b.format as ExportFormat)) {
      return {
        ok: false,
        error: `Invalid format. Must be one of: ${VALID_EXPORT_FORMATS.join(", ")}.`,
      };
    }
    format = b.format as ExportFormat;
  }

  const result: ExportReportInput = {
    dataset: b.dataset as ExportDataset,
    format,
  };

  if (typeof b.departmentId === "string" && b.departmentId.trim()) {
    result.departmentId = b.departmentId.trim();
  }

  return { ok: true, data: result };
}
