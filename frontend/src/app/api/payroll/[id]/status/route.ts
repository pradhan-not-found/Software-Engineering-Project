import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSetPayrollStatusInput } from "@/lib/validations/payroll.schema";
import { PayrollService } from "@/lib/services/payroll.service";
import { authService } from "@/lib/services/auth.service";

export const dynamic = "force-dynamic";

const payrollService = new PayrollService();

interface RouteParams {
  params: { id: string };
}

/**
 * POST /api/payroll/[id]/status
 * Update status to PROCESSED or PAID
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("ems-session")?.value;
    const currentUser = token ? await authService.getSessionUser(token) : null;

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const validation = validateSetPayrollStatusInput(body);

    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    const result = await payrollService.setPayrollStatus(params.id, validation.data, currentUser);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (err: any) {
    console.error("POST /api/payroll/[id]/status Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to update payroll status." },
      { status: 500 }
    );
  }
}
