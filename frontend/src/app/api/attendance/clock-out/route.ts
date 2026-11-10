import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AttendanceService } from "@/lib/services/attendance.service";
import { authService } from "@/lib/services/auth.service";

export const dynamic = "force-dynamic";

const attService = new AttendanceService();

/**
 * POST /api/attendance/clock-out
 */
export async function POST() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("ems-session")?.value;
    const currentUser = token ? await authService.getSessionUser(token) : null;

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const result = await attService.clockOut(currentUser.id);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (err: any) {
    console.error("POST /api/attendance/clock-out Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to clock out." },
      { status: 500 }
    );
  }
}

