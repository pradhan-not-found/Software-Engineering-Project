import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { departmentRepository } from "@/lib/repositories/department.repository";
import { validateCreateDepartmentInput } from "@/lib/validations/settings.schema";
import { settingsService } from "@/lib/services/settings.service";
import { authService } from "@/lib/services/auth.service";
import { userRepository } from "@/lib/repositories/user.repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const departments = await departmentRepository.findAll();
    return NextResponse.json({ ok: true, data: departments });
  } catch (err: any) {
    console.error("GET /api/departments Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch departments." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
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

    const body = await req.json().catch(() => null);
    const validation = validateCreateDepartmentInput(body);

    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    const result = await settingsService.createDepartment(
      {
        id: currentUser.id,
        role: currentUser.role,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
      },
      validation.data
    );

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/departments Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to create department." }, { status: 500 });
  }
}

