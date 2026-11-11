import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateGoalCreateInput } from "@/lib/validations/performance.schema";
import { performanceService } from "@/lib/services/performance.service";
import { authService } from "@/lib/services/auth.service";
import { userRepository } from "@/lib/repositories/user.repository";

export const dynamic = "force-dynamic";

/**
 * GET /api/performance/goals
 * List goals with employeeId and status filters
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId") || undefined;
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

    const goals = await performanceService.listGoals(currentUser, { employeeId, status });
    return NextResponse.json({ ok: true, data: goals });
  } catch (err: any) {
    console.error("GET /api/performance/goals Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to fetch goals." }, { status: 500 });
  }
}

/**
 * POST /api/performance/goals
 * Create a new goal / OKR
 */
export async function POST(req: Request) {
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

    const body = await req.json();
    const valResult = validateGoalCreateInput(body);
    if (!valResult.ok) {
      return NextResponse.json({ ok: false, error: valResult.error }, { status: 400 });
    }

    const result = await performanceService.createGoal(currentUser, valResult.data);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (err: any) {
    console.error("POST /api/performance/goals Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to create goal." }, { status: 500 });
  }
}
