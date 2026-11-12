import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { notificationService } from "@/lib/services/notification.service";
import { authService } from "@/lib/services/auth.service";
import { userRepository } from "@/lib/repositories/user.repository";

export const dynamic = "force-dynamic";

/**
 * GET /api/activity
 * Returns organization audit log (Admin RBAC restricted)
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

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;
    const entity = searchParams.get("entity") || undefined;
    const query = searchParams.get("query") || searchParams.get("q") || undefined;

    const result = await notificationService.getAuditLog(
      {
        id: currentUser.id,
        role: currentUser.role,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
      },
      { category, entity, query }
    );

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 403 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("GET /api/activity Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to fetch organization activity." }, { status: 500 });
  }
}

/**
 * POST /api/activity
 * Records a new activity log item (System / cross-module trigger)
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
    const result = await notificationService.logActivity(body);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("POST /api/activity Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to log activity." }, { status: 500 });
  }
}

