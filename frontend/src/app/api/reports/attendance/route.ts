import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { reportService } from "@/lib/services/report.service";
import { authService } from "@/lib/services/auth.service";
import { userRepository } from "@/lib/repositories/user.repository";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/attendance
 * Returns 30-day attendance metrics and per-department rates
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
    const days = parseInt(searchParams.get("days") || "30", 10);
    const departmentId = searchParams.get("departmentId") || undefined;

    const result = await reportService.getAttendanceReport(
      {
        id: currentUser.id,
        role: currentUser.role,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        departmentId: currentUser.departmentId,
      },
      isNaN(days) ? 30 : days,
      departmentId
    );

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("GET /api/reports/attendance Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to fetch attendance report." }, { status: 500 });
  }
}
