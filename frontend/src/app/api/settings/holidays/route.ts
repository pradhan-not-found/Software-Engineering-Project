import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateCreateHolidayInput } from "@/lib/validations/settings.schema";
import { settingsService } from "@/lib/services/settings.service";
import { authService } from "@/lib/services/auth.service";
import { userRepository } from "@/lib/repositories/user.repository";
import { settingsRepository } from "@/lib/repositories/settings.repository";

export const dynamic = "force-dynamic";

/**
 * GET /api/settings/holidays
 * Lists holidays for calendar
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year") || undefined;
    const holidays = await settingsRepository.getHolidays(year);
    return NextResponse.json({ ok: true, data: holidays });
  } catch (err: any) {
    console.error("GET /api/settings/holidays Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to fetch holidays." }, { status: 500 });
  }
}

/**
 * POST /api/settings/holidays
 * Adds a new holiday
 */
export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token =
      cookieStore.get("ems-session")?.value ||
      req.headers.get("x-session-id") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    let currentUser = token ? await authService.getSessionUser(token) : null;
    if (!currentUser) {
      currentUser = await userRepository.findById(token || "e1");
    }

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const validation = validateCreateHolidayInput(body);

    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    const result = await settingsService.createHoliday(
      {
        id: currentUser.id,
        role: currentUser.role,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
      },
      validation.data
    );

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/settings/holidays Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to create holiday." }, { status: 500 });
  }
}

