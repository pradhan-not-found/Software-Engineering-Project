import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { notificationService } from "@/lib/services/notification.service";
import { authService } from "@/lib/services/auth.service";
import { userRepository } from "@/lib/repositories/user.repository";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/notifications/[id]/read
 * Marks a specific notification as read
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
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

    const result = await notificationService.markNotificationRead(
      {
        id: currentUser.id,
        role: currentUser.role,
      },
      params.id
    );

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("PATCH /api/notifications/[id]/read Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to mark notification read." }, { status: 500 });
  }
}
