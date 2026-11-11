import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { performanceService } from "@/lib/services/performance.service";
import { authService } from "@/lib/services/auth.service";
import { userRepository } from "@/lib/repositories/user.repository";

export const dynamic = "force-dynamic";

/**
 * GET /api/performance/reviews/[id]
 * Fetch single review by ID with optional Connected Wedge objective delivery data
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
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

    const reviewRes = await performanceService.getReviewById(currentUser, params.id);
    if (!reviewRes.ok) {
      return NextResponse.json({ ok: false, error: reviewRes.error }, { status: 404 });
    }

    const review = reviewRes.data;
    const cycle = await performanceService.getCycleById(review.cycleId);

    let workData = null;
    if (cycle) {
      workData = await performanceService.getObjectiveWorkData(
        review.employeeId,
        cycle.startDate,
        cycle.endDate
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        review,
        cycle,
        workData,
      },
    });
  } catch (err: any) {
    console.error(`GET /api/performance/reviews/${params.id} Error:`, err);
    return NextResponse.json({ ok: false, error: "Failed to fetch review." }, { status: 500 });
  }
}

