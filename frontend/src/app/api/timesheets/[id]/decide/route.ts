import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateTimesheetDecideInput } from "@/lib/validations/attendance.schema";
import { TimesheetService } from "@/lib/services/timesheet.service";
import { authService } from "@/lib/services/auth.service";

export const dynamic = "force-dynamic";

const tsService = new TimesheetService();

interface RouteParams {
  params: { id: string };
}

/**
 * POST /api/timesheets/[id]/decide
 * Approve or reject a submitted timesheet
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("ems-session")?.value;
    const currentUser = token ? await authService.getSessionUser(token) : null;

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const validation = validateTimesheetDecideInput(body);

    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    const result = await tsService.decideTimesheet(params.id, validation.data, currentUser);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (err: any) {
    console.error("POST /api/timesheets/[id]/decide Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to decide timesheet." },
      { status: 500 }
    );
  }
}
