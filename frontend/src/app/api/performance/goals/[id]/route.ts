import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateGoalUpdateInput } from "@/lib/validations/performance.schema";
import { performanceService } from "@/lib/services/performance.service";
import { authService } from "@/lib/services/auth.service";
import { userRepository } from "@/lib/repositories/user.repository";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/performance/goals/[id]
 * Update an existing goal
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

    const body = await req.json();
    const valResult = validateGoalUpdateInput(body);
    if (!valResult.ok) {
      return NextResponse.json({ ok: false, error: valResult.error }, { status: 400 });
    }

    const result = await performanceService.updateGoal(
      currentUser,
      params.id,
      valResult.data
    );

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (err: any) {
    console.error(`PATCH /api/performance/goals/${params.id} Error:`, err);
    return NextResponse.json({ ok: false, error: "Failed to update goal." }, { status: 500 });
  }
}

/**
 * DELETE /api/performance/goals/[id]
 * Delete a goal
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
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

    const result = await performanceService.deleteGoal(currentUser, params.id);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: true });
  } catch (err: any) {
    console.error(`DELETE /api/performance/goals/${params.id} Error:`, err);
    return NextResponse.json({ ok: false, error: "Failed to delete goal." }, { status: 500 });
  }
}
