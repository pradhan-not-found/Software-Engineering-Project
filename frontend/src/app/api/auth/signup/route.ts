import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSignupInput } from "@/lib/validations/auth.schema";
import { authService } from "@/lib/services/auth.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const validation = validateSignupInput(body);
    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    const result = await authService.signup(validation.data);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    const cookieStore = cookies();
    cookieStore.set("ems-session", result.data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({
      ok: true,
      user: result.data.user,
      token: result.data.token,
    });
  } catch (err: any) {
    console.error("Signup API Handler Error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error during registration." },
      { status: 500 }
    );
  }
}
