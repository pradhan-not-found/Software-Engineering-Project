import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { performanceService } from "@/lib/services/performance.service";
import { authService } from "@/lib/services/auth.service";
import { userRepository } from "@/lib/repositories/user.repository";

export const dynamic = "force-dynamic";

/**
 * GET /api/performance/reviews
 * List performance reviews filtered by cycle, employee, reviewer, or status.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cycleId = searchParams.get("cycleId") || undefined;
    const employeeId = searchParams.get("employeeId") || undefined;
    const reviewerId = searchParams.get("reviewerId") || undefined;
    const status = searchParams.get("status") || undefined;

    const cookieStore = cookies();
    const token =
      cookieStore.get("ems-session")?.value ||
      req.headers.get("x-session-id") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    let currentUser = token ? await authService.getSessionUser(token) : null;
    if (!currentUser) {
      currentUser = await userRepository.findById("e1");
    }

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const reviews = await performanceService.listReviews(currentUser, {
      cycleId,
      employeeId,
      reviewerId,
      status,
    });

    return NextResponse.json({ ok: true, data: reviews });
  } catch (err: any) {
    console.error("GET /api/performance/reviews Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to fetch reviews." }, { status: 500 });
  }
}
