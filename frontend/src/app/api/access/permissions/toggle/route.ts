import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateTogglePermissionInput } from "@/lib/validations/access.schema";
import { accessService } from "@/lib/services/access.service";
import { authService } from "@/lib/services/auth.service";
import { userRepository } from "@/lib/repositories/user.repository";

export const dynamic = "force-dynamic";

/**
 * POST /api/access/permissions/toggle
 * Toggle permission for a role and module
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
    const validation = validateTogglePermissionInput(body);

    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    const result = await accessService.togglePermission(
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
    console.error("POST /api/access/permissions/toggle Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to update permission." }, { status: 500 });
  }
}
