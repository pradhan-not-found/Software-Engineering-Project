import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { leaveService } from "@/lib/services/leave.service";
import { authService } from "@/lib/services/auth.service";

export const dynamic = "force-dynamic";

/**
 * POST /api/leaves/[id]/cancel
 * Cancel a pending leave request
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("ems-session")?.value;
    const currentUser = token ? await authService.getSessionUser(token) : null;

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
    }

    const result = await leaveService.cancelLeave(params.id, currentUser.id);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: "Leave request cancelled." });
  } catch (err: any) {
    console.error("POST /api/leaves/[id]/cancel Error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error." }, { status: 500 });
  }
}
