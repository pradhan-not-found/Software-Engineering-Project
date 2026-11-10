import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateClockInInput } from "@/lib/validations/attendance.schema";
import { AttendanceService } from "@/lib/services/attendance.service";
import { authService } from "@/lib/services/auth.service";

export const dynamic = "force-dynamic";

const attService = new AttendanceService();

/**
 * POST /api/attendance/clock-in
 */
export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("ems-session")?.value;
    const currentUser = token ? await authService.getSessionUser(token) : null;

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const validation = validateClockInInput(body);

    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    const result = await attService.clockIn(currentUser.id, validation.data);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (err: any) {
    console.error("POST /api/attendance/clock-in Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to clock in." },
      { status: 500 }
    );
  }
}
