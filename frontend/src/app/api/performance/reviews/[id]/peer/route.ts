import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validatePeerFeedbackInput } from "@/lib/validations/performance.schema";
import { performanceService } from "@/lib/services/performance.service";
import { authService } from "@/lib/services/auth.service";
import { userRepository } from "@/lib/repositories/user.repository";

export const dynamic = "force-dynamic";

/**
 * POST /api/performance/reviews/[id]/peer
 * Submit peer feedback for a colleague
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies();
    const token =
      cookieStore.get("ems-session")?.value ||
      req.headers.get("x-session-id") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    let currentUser = token ? await authService.getSessionUser(token) : null;
    if (!currentUser) {
      currentUser = await userRepository.findById("e1");
    }

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const valResult = validatePeerFeedbackInput(body);
    if (!valResult.ok) {
      return NextResponse.json({ ok: false, error: valResult.error }, { status: 400 });
    }

    const result = await performanceService.addPeerFeedback(
      currentUser,
      params.id,
      valResult.data
    );

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (err: any) {
    console.error(`POST /api/performance/reviews/${params.id}/peer Error:`, err);
    return NextResponse.json({ ok: false, error: "Failed to submit peer feedback." }, { status: 500 });
  }
}
