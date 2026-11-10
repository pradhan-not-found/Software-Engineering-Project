import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateCommentInput } from "@/lib/validations/task.schema";
import { TaskService } from "@/lib/services/task.service";
import { authService } from "@/lib/services/auth.service";

export const dynamic = "force-dynamic";

const taskService = new TaskService();

interface RouteParams {
  params: { id: string };
}

/**
 * POST /api/tasks/[id]/comments
 * Add comment to task
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("ems-session")?.value;
    const currentUser = token ? await authService.getSessionUser(token) : null;

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const validation = validateCommentInput(body);

    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    const result = await taskService.addComment(params.id, validation.data.text, currentUser);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: result.comment }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/tasks/[id]/comments Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to add comment." },
      { status: 500 }
    );
  }
}

