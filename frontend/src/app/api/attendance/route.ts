import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSetAttendanceInput } from "@/lib/validations/attendance.schema";
import { AttendanceService } from "@/lib/services/attendance.service";
import { authService } from "@/lib/services/auth.service";

export const dynamic = "force-dynamic";

const attService = new AttendanceService();

/**
 * GET /api/attendance
 * List attendance records for a specific date or month
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const month = searchParams.get("month");
    const employeeId = searchParams.get("employeeId") || undefined;

    if (date) {
      const records = await attService.getDailyRegister(date);
      return NextResponse.json({ ok: true, data: records });
    }

    if (month) {
      const records = await attService.getMonthlyRecords(month, employeeId);
      return NextResponse.json({ ok: true, data: records });
    }

    const records = await attService.getDailyRegister(new Date().toISOString().slice(0, 10));
    return NextResponse.json({ ok: true, data: records });
  } catch (err: any) {
    console.error("GET /api/attendance Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch attendance records." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/attendance
 * Admin manual attendance update
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
    const validation = validateSetAttendanceInput(body);

    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    const result = await attService.setManualAttendance(validation.data, currentUser);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (err: any) {
    console.error("POST /api/attendance Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to set attendance." },
      { status: 500 }
    );
  }
}
