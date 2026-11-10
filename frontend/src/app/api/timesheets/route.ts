import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateTimesheetSaveInput } from "@/lib/validations/attendance.schema";
import { TimesheetService } from "@/lib/services/timesheet.service";
import { authService } from "@/lib/services/auth.service";

export const dynamic = "force-dynamic";

const tsService = new TimesheetService();

/**
 * GET /api/timesheets
 * List timesheets (mine or pending approval)
 */
export async function GET(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("ems-session")?.value;
    const currentUser = token ? await authService.getSessionUser(token) : null;

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const scope = (searchParams.get("scope") as "mine" | "pending") || "mine";

    const timesheets = await tsService.listTimesheets(currentUser, scope);
    return NextResponse.json({ ok: true, data: timesheets });
  } catch (err: any) {
    console.error("GET /api/timesheets Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch timesheets." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/timesheets
 * Save draft or submit timesheet
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
    const validation = validateTimesheetSaveInput(body);

    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    const result = await tsService.saveTimesheet(currentUser.id, validation.data, currentUser);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (err: any) {
    console.error("POST /api/timesheets Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to save timesheet." },
      { status: 500 }
    );
  }
}
