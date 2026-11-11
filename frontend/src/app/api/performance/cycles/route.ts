import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateReviewCycleCreateInput } from "@/lib/validations/performance.schema";
import { performanceService } from "@/lib/services/performance.service";
import { authService } from "@/lib/services/auth.service";
import { userRepository } from "@/lib/repositories/user.repository";

export const dynamic = "force-dynamic";

/**
 * GET /api/performance/cycles
 * List review cycles (optional ?status= filter)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
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

    const cycles = await performanceService.listCycles(status);
    return NextResponse.json({ ok: true, data: cycles });
  } catch (err: any) {
    console.error("GET /api/performance/cycles Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to fetch review cycles." }, { status: 500 });
  }
}

/**
 * POST /api/performance/cycles
 * Launch a new review cycle
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

    const body = await req.json().catch(() => null);
    const validation = validateReviewCycleCreateInput(body);

    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    const result = await performanceService.createCycle(currentUser, validation.data);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: result.data }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/performance/cycles Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to launch review cycle." }, { status: 500 });
  }
}

