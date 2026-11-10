import { NextResponse } from "next/server";
import { departmentRepository } from "@/lib/repositories/department.repository";

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

