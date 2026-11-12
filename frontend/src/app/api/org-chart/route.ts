import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { orgChartService } from "@/lib/services/org-chart.service";
import { authService } from "@/lib/services/auth.service";
import { userRepository } from "@/lib/repositories/user.repository";

export const dynamic = "force-dynamic";

/**
 * GET /api/org-chart
 * Returns the interactive reporting hierarchy tree, executive metrics, and departments
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
    const query = searchParams.get("query") || searchParams.get("q") || undefined;
    const includeTerminated = searchParams.get("includeTerminated") === "true";

    const result = await orgChartService.getHierarchy(
      {
        id: currentUser.id,
        role: currentUser.role,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
      },
      { departmentId, query, includeTerminated }
    );

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("GET /api/org-chart Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to fetch organization hierarchy." }, { status: 500 });
  }
}
