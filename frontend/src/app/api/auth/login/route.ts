import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateLoginInput } from "@/lib/validations/auth.schema";
import { authService } from "@/lib/services/auth.service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Validation
    const validation = validateLoginInput(body);
    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    // 2. Business Logic Execution
    const result = await authService.login(validation.data.email, validation.data.password);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 401 });
    }

    // 3. Issue HTTP-Only Cookie
    const cookieStore = cookies();
    cookieStore.set("ems-session", result.data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return NextResponse.json({
      ok: true,
      user: result.data.user,
      token: result.data.token,
    });
  } catch (err: any) {
    console.error("Login API Handler Error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error during authentication." },
      { status: 500 }
    );
  }
}
