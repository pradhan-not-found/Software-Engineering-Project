import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authService } from "@/lib/services/auth.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("ems-session")?.value;

    if (!token) {
      return NextResponse.json({ ok: false, user: null }, { status: 401 });
    }

    const user = await authService.getSessionUser(token);
    if (!user) {
      return NextResponse.json({ ok: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      user,
    });
  } catch (err: any) {
    console.error("Auth Me API Handler Error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
