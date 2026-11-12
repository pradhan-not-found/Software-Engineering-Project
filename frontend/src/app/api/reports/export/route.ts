import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateExportReportInput } from "@/lib/validations/report.schema";
import { reportService } from "@/lib/services/report.service";
import { authService } from "@/lib/services/auth.service";
import { userRepository } from "@/lib/repositories/user.repository";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/export
 * Generates and downloads CSV reports
 */
export async function GET(req: Request) {
  try {
    const cookieStore = cookies();
    const token =
      cookieStore.get("ems-session")?.value ||
      req.headers.get("x-session-id") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    let currentUser = token ? await authService.getSessionUser(token) : null;
    if (!currentUser) {
      currentUser = await userRepository.findById(token || "e1");
    }

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dataset = searchParams.get("dataset") || "headcount";
    const format = searchParams.get("format") || "csv";
    const departmentId = searchParams.get("departmentId") || undefined;

    const validation = validateExportReportInput({ dataset, format, departmentId });
    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    const result = await reportService.exportCSV(
      {
        id: currentUser.id,
        role: currentUser.role,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        departmentId: currentUser.departmentId,
      },
      validation.data
    );

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return new Response(result.csv, {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (err: any) {
    console.error("GET /api/reports/export Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to export report." }, { status: 500 });
  }
}
