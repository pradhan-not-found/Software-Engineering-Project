import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateNewHireInput } from "@/lib/validations/employee.schema";
import { employeeService } from "@/lib/services/employee.service";
import { authService } from "@/lib/services/auth.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/employees
 * Lists all employees with optional query filters (search, department, status)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get("departmentId") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || searchParams.get("q") || undefined;

    const employees = await employeeService.listEmployees({
      departmentId,
      status,
      search,
    });

    return NextResponse.json({ ok: true, data: employees });
  } catch (err: any) {
    console.error("GET /api/employees Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch employees." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/employees
 * Atomic New Hire Creation with Connected Wedge Onboarding Kanban Board
 */
export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("ems-session")?.value;
    const currentUser = token ? await authService.getSessionUser(token) : null;

    const body = await req.json();

    // 1. Validation
    const validation = validateNewHireInput(body);
    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    // 2. Business Logic & Connected Wedge
    const result = await employeeService.hireEmployee(
      validation.data,
      currentUser?.id || null
    );

    return NextResponse.json({
      ok: true,
      data: result.employee,
      board: result.board,
      tasks: result.tasks,
      message: `${result.employee.firstName} ${result.employee.lastName} added with onboarding board auto-generated.`,
    });
  } catch (err: any) {
    console.error("POST /api/employees Error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error while hiring employee." },
      { status: 500 }
    );
  }
}

