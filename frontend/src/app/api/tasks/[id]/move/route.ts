import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { TaskService } from "@/lib/services/task.service";
import { authService } from "@/lib/services/auth.service";

export const dynamic = "force-dynamic";

const taskService = new TaskService();

interface RouteParams {
  params: { id: string };
}

/**
 * POST /api/tasks/[id]/move
 * Moves task across Kanban columns and triggers completion / recurrence state transitions
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
    if (!body || typeof body.columnId !== "string" || !body.columnId.trim()) {
      return NextResponse.json({ ok: false, error: "Target columnId is required." }, { status: 400 });
    }

    const result = await taskService.moveTask(
      params.id,
      body.columnId.trim(),
      typeof body.beforeId === "string" ? body.beforeId : null,
      currentUser
    );

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: result.data, spawnedNext: result.spawnedNext });
  } catch (err: any) {
    console.error("POST /api/tasks/[id]/move Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to move task." },
      { status: 500 }
    );
  }
}
