import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateLeaveRequestInput } from "@/lib/validations/leave.schema";
import { leaveService } from "@/lib/services/leave.service";
import { authService } from "@/lib/services/auth.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/leaves
 * Lists leave requests with optional filters
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId") || undefined;
    const status = searchParams.get("status") || undefined;

    const leaves = await leaveService.listLeaves({ employeeId, status });
    return NextResponse.json({ ok: true, data: leaves });
  } catch (err: any) {
    console.error("GET /api/leaves Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch leave requests." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leaves
 * Submit a new leave request
 */
export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("ems-session")?.value;
    const currentUser = token ? await authService.getSessionUser(token) : null;

    if (!currentUser) {
      return NextResponse.json(
        { ok: false, error: "Authentication required to submit leave." },
        { status: 401 }
      );
    }

    const body = await req.json();

    // 1. Validation
    const validation = validateLeaveRequestInput(body);
    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    // 2. Business Logic Execution
    const result = await leaveService.requestLeave(currentUser.id, validation.data);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      data: result.data,
      message: "Leave request submitted successfully.",
    });
  } catch (err: any) {
    console.error("POST /api/leaves Error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error while submitting leave." },
      { status: 500 }
    );
  }
}
