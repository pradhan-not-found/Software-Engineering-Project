import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateTaskPatchInput } from "@/lib/validations/task.schema";
import { TaskService } from "@/lib/services/task.service";
import { authService } from "@/lib/services/auth.service";

export const dynamic = "force-dynamic";

const taskService = new TaskService();

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/tasks/[id]
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const task = await taskService.getTask(params.id);
    if (!task) {
      return NextResponse.json({ ok: false, error: "Task not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: task });
  } catch (err: any) {
    console.error("GET /api/tasks/[id] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch task." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tasks/[id]
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("ems-session")?.value;
    const currentUser = token ? await authService.getSessionUser(token) : null;

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const validation = validateTaskPatchInput(body);

    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    const result = await taskService.updateTask(params.id, validation.data, currentUser);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (err: any) {
    console.error("PATCH /api/tasks/[id] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to update task." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/[id]
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("ems-session")?.value;
    const currentUser = token ? await authService.getSessionUser(token) : null;

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const result = await taskService.deleteTask(params.id, currentUser);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/tasks/[id] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to delete task." },
      { status: 500 }
    );
  }
}

