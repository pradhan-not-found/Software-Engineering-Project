import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { settingsService } from "@/lib/services/settings.service";
import { authService } from "@/lib/services/auth.service";
import { userRepository } from "@/lib/repositories/user.repository";

export const dynamic = "force-dynamic";

/**
 * GET /api/settings/overview
 * Returns organization profile, departments, and holiday calendar
 */
export async function GET(req: Request) {
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

    const result = await settingsService.getSettingsOverview({
      id: currentUser.id,
      role: currentUser.role,
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("GET /api/settings/overview Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to fetch settings overview." }, { status: 500 });
  }
}

