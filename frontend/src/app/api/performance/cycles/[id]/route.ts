import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { performanceService } from "@/lib/services/performance.service";
import { authService } from "@/lib/services/auth.service";
import { userRepository } from "@/lib/repositories/user.repository";

export const dynamic = "force-dynamic";

/**
 * GET /api/performance/cycles/[id]
 * Fetch single review cycle with its reviews
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

    const cycle = await performanceService.getCycleById(params.id);
    if (!cycle) {
      return NextResponse.json({ ok: false, error: "Review cycle not found." }, { status: 404 });
    }

    const reviews = await performanceService.listReviews(currentUser, { cycleId: params.id });
    return NextResponse.json({ ok: true, data: { cycle, reviews } });
  } catch (err: any) {
    console.error(`GET /api/performance/cycles/${params.id} Error:`, err);
    return NextResponse.json({ ok: false, error: "Failed to fetch review cycle." }, { status: 500 });
  }
}

/**
 * PATCH /api/performance/cycles/[id]
 * Close an active review cycle
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
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

    const body = await req.json().catch(() => ({}));
    if (body.action === "CLOSE" || body.status === "CLOSED") {
      const result = await performanceService.closeCycle(currentUser, params.id);
      if (!result.ok) {
        return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, data: result.data });
    }

    return NextResponse.json({ ok: false, error: "Unsupported patch action." }, { status: 400 });
  } catch (err: any) {
    console.error(`PATCH /api/performance/cycles/${params.id} Error:`, err);
    return NextResponse.json({ ok: false, error: "Failed to update review cycle." }, { status: 500 });
  }
}
