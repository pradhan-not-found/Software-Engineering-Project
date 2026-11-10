import { NextResponse } from "next/server";
import { validateEmployeePatch } from "@/lib/validations/employee.schema";
import { employeeService } from "@/lib/services/employee.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/employees/[id]
 * Get single employee profile
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const employee = await employeeService.getEmployeeById(params.id);
    if (!employee) {
      return NextResponse.json({ ok: false, error: "Employee not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: employee });
  } catch (err: any) {
    console.error("GET /api/employees/[id] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch employee details." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/employees/[id]
 * Update employee record
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    const validation = validateEmployeePatch(body);
    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    const updated = await employeeService.updateEmployee(params.id, validation.data);
    if (!updated) {
      return NextResponse.json({ ok: false, error: "Employee not found or update failed." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (err: any) {
    console.error("PATCH /api/employees/[id] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to update employee." },
      { status: 500 }
    );
  }
}
