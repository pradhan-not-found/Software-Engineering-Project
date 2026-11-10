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
 * GET /api/payroll/[id]
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("ems-session")?.value;
    const currentUser = token ? await authService.getSessionUser(token) : null;

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const run = await payrollService.getRun(params.id);
    if (!run) {
      return NextResponse.json({ ok: false, error: "Payroll run not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: run });
  } catch (err: any) {
    console.error("GET /api/payroll/[id] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch payroll run." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/payroll/[id]
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("ems-session")?.value;
    const currentUser = token ? await authService.getSessionUser(token) : null;

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const result = await payrollService.deletePayrollRun(params.id, currentUser);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/payroll/[id] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to delete payroll run." },
      { status: 500 }
    );
  }
}
