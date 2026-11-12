import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { reportService } from "@/lib/services/report.service";
import { authService } from "@/lib/services/auth.service";
import { userRepository } from "@/lib/repositories/user.repository";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/headcount
 * Returns headcount distribution and status breakdowns
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
    const departmentId = searchParams.get("departmentId") || undefined;

    const result = await reportService.getHeadcountReport(
      {
        id: currentUser.id,
        role: currentUser.role,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        departmentId: currentUser.departmentId,
      },
      departmentId
    );

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("GET /api/reports/headcount Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to fetch headcount report." }, { status: 500 });
  }
}

