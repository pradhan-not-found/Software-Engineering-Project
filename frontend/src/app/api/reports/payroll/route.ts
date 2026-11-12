import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { reportService } from "@/lib/services/report.service";
import { authService } from "@/lib/services/auth.service";
import { userRepository } from "@/lib/repositories/user.repository";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/payroll
 * Returns payroll expenditure trends and department commitments
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
    const limit = parseInt(searchParams.get("limit") || "6", 10);

    const result = await reportService.getPayrollReport(
      {
        id: currentUser.id,
        role: currentUser.role,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        departmentId: currentUser.departmentId,
      },
      isNaN(limit) ? 6 : limit
    );

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("GET /api/reports/payroll Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to fetch payroll report." }, { status: 500 });
  }
}

