import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSetShiftInput } from "@/lib/validations/attendance.schema";
import { AttendanceService } from "@/lib/services/attendance.service";
import { authService } from "@/lib/services/auth.service";

export const dynamic = "force-dynamic";

const attService = new AttendanceService();

/**
 * POST /api/attendance/shift
 */
export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("ems-session")?.value;
    const currentUser = token ? await authService.getSessionUser(token) : null;

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const validation = validateSetShiftInput(body);

    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    const result = await attService.setShift(validation.data, currentUser);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("POST /api/attendance/shift Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to set shift." },
      { status: 500 }
    );
  }
}
