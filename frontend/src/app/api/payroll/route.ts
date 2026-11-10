import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateGeneratePayrollInput } from "@/lib/validations/payroll.schema";
import { PayrollService } from "@/lib/services/payroll.service";
import { authService } from "@/lib/services/auth.service";

export const dynamic = "force-dynamic";

const payrollService = new PayrollService();

/**
 * GET /api/payroll
 * List all payroll runs
 */
export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("ems-session")?.value;
    const currentUser = token ? await authService.getSessionUser(token) : null;

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const runs = await payrollService.listRuns();
    return NextResponse.json({ ok: true, data: runs });
  } catch (err: any) {
    console.error("GET /api/payroll Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch payroll runs." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payroll
 * Generate monthly draft payroll run
 */
export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("ems-session")?.value;
    const currentUser = token ? await authService.getSessionUser(token) : null;

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const validation = validateGeneratePayrollInput(body);

    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    const result = await payrollService.generatePayroll(validation.data, currentUser);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: result.data }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/payroll Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to generate payroll." },
      { status: 500 }
    );
  }
}

