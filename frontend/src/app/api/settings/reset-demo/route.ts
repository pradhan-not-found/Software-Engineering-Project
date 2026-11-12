import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { settingsService } from "@/lib/services/settings.service";
import { authService } from "@/lib/services/auth.service";
import { userRepository } from "@/lib/repositories/user.repository";

export const dynamic = "force-dynamic";

/**
 * POST /api/settings/reset-demo
 * Resets database and demo data to original seed
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

    const result = await settingsService.resetDemo({
      id: currentUser.id,
      role: currentUser.role,
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("POST /api/settings/reset-demo Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to reset demo data." }, { status: 500 });
  }
}
