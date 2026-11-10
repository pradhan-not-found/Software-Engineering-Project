import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PayrollService } from "@/lib/services/payroll.service";
import { authService } from "@/lib/services/auth.service";

export const dynamic = "force-dynamic";

const payrollService = new PayrollService();

/**
 * GET /api/payroll/payslips
 * List issued payslips for the authenticated employee
 */
export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("ems-session")?.value;
    const currentUser = token ? await authService.getSessionUser(token) : null;

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const slips = await payrollService.getEmployeePayslips(currentUser.id);
    return NextResponse.json({ ok: true, data: slips });
  } catch (err: any) {
    console.error("GET /api/payroll/payslips Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch payslips." },
      { status: 500 }
    );
  }
}
