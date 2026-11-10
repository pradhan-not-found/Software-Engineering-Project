import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateDashboardFilterInput } from "@/lib/validations/dashboard.schema";
import { DashboardService } from "@/lib/services/dashboard.service";
import { authService } from "@/lib/services/auth.service";

export const dynamic = "force-dynamic";

const dashboardService = new DashboardService();

/**
 * GET /api/dashboard/overview
 * Returns executive KPIs, pending approvals inbox, connected signals, and activity feed
 */
export async function GET(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("ems-session")?.value;
    const currentUser = token ? await authService.getSessionUser(token) : null;

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || undefined;
    const category = (searchParams.get("category") as any) || "ALL";

    const validation = validateDashboardFilterInput({ date, category });
    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    const result = await dashboardService.getOverview(currentUser, validation.data);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 403 });
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (err: any) {
    console.error("GET /api/dashboard/overview Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch dashboard overview." },
      { status: 500 }
    );
  }
}

