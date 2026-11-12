import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateUpdateOrgInput } from "@/lib/validations/settings.schema";
import { settingsService } from "@/lib/services/settings.service";
import { authService } from "@/lib/services/auth.service";
import { userRepository } from "@/lib/repositories/user.repository";

export const dynamic = "force-dynamic";

/**
 * GET /api/settings/org
 * Returns organization workspace settings
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

    const overview = await settingsService.getSettingsOverview({
      id: currentUser.id,
      role: currentUser.role,
    });

    if (!overview.ok) {
      return NextResponse.json({ ok: false, error: overview.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: overview.data.org });
  } catch (err: any) {
    console.error("GET /api/settings/org Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to fetch organization settings." }, { status: 500 });
  }
}

/**
 * PATCH /api/settings/org
 * Updates organization workspace settings
 */
export async function PATCH(req: Request) {
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
    const validation = validateUpdateOrgInput(body);

    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    const result = await settingsService.updateOrg(
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

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("PATCH /api/settings/org Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to update organization settings." }, { status: 500 });
  }
}
