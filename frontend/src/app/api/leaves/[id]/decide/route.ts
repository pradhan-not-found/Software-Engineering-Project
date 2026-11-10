import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateLeaveDecisionInput } from "@/lib/validations/leave.schema";
import { leaveService } from "@/lib/services/leave.service";
import { authService } from "@/lib/services/auth.service";

export const dynamic = "force-dynamic";

/**
 * POST /api/leaves/[id]/decide
 * Decide on leave request (Approve/Reject) + Connected Wedge Task Delay Flagging
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("ems-session")?.value;
    const currentUser = token ? await authService.getSessionUser(token) : null;

    if (!currentUser) {
      return NextResponse.json(
        { ok: false, error: "Authentication required to decide leave requests." },
        { status: 401 }
      );
    }

    const body = await req.json();

    // 1. Validation
    const validation = validateLeaveDecisionInput(body);
    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    // 2. Business Logic Execution with Connected Wedge
    const result = await leaveService.decideLeave(
      params.id,
      validation.data.approve,
      currentUser.id,
      validation.data.comment
    );

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      data: result.data.leave,
      flaggedTasksCount: result.data.flaggedTasksCount,
      message: validation.data.approve
        ? `Leave approved — ${result.data.flaggedTasksCount} task(s) flagged “Delayed — On Leave”.`
        : "Leave request rejected.",
    });
  } catch (err: any) {
    console.error("POST /api/leaves/[id]/decide Error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error while deciding leave." },
      { status: 500 }
    );
  }
}

