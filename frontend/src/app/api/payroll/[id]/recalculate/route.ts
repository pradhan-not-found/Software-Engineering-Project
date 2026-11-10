import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PayrollService } from "@/lib/services/payroll.service";
import { authService } from "@/lib/services/auth.service";

export const dynamic = "force-dynamic";

const payrollService = new PayrollService();

interface RouteParams {
  params: { id: string };
}

/**
 * POST /api/payroll/[id]/recalculate
 * Recalculate draft payroll run
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("ems-session")?.value;
    const currentUser = token ? await authService.getSessionUser(token) : null;

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const result = await payrollService.recalculatePayroll(params.id, currentUser);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (err: any) {
    console.error("POST /api/payroll/[id]/recalculate Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to recalculate payroll." },
      { status: 500 }
    );
  }
}

