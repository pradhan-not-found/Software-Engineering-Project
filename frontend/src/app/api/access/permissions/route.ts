import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { accessService } from "@/lib/services/access.service";
import { authService } from "@/lib/services/auth.service";
import { userRepository } from "@/lib/repositories/user.repository";

export const dynamic = "force-dynamic";

/**
 * GET /api/access/permissions
 * Returns permissions matrix and role counts
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

    const data = await accessService.getMatrix({
      id: currentUser.id,
      role: currentUser.role,
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
    });

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("GET /api/access/permissions Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to fetch access permissions." }, { status: 500 });
  }
}
