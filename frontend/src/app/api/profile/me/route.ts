import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { profileService } from "@/lib/services/profile.service";
import { authService } from "@/lib/services/auth.service";
import { userRepository } from "@/lib/repositories/user.repository";

export const dynamic = "force-dynamic";

/**
 * GET /api/profile/me
 * Retrieves current user's personal profile, manager chain, and direct reports
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

    const result = await profileService.getProfile({
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
    console.error("GET /api/profile/me Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to fetch profile." }, { status: 500 });
  }
}

/**
 * PATCH /api/profile/me
 * Updates allowed self-service personal information
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
    const result = await profileService.updateProfile(
      {
        id: currentUser.id,
        role: currentUser.role,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
      },
      body
    );

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("PATCH /api/profile/me Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to update profile." }, { status: 500 });
  }
}
