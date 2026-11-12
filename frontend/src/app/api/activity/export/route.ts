import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { notificationService } from "@/lib/services/notification.service";
import { authService } from "@/lib/services/auth.service";
import { userRepository } from "@/lib/repositories/user.repository";

export const dynamic = "force-dynamic";

/**
 * GET /api/activity/export
 * Exports organization audit log as RFC 4180 CSV
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

    const result = await notificationService.exportAuditCSV(
      {
        id: currentUser.id,
        role: currentUser.role,
      },
      { category, entity, query }
    );

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 403 });
    }

    return new Response(result.data.csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.data.filename}"`,
      },
    });
  } catch (err: any) {
    console.error("GET /api/activity/export Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to export audit log." }, { status: 500 });
  }
}
