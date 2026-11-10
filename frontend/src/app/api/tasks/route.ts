import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateTaskCreateInput } from "@/lib/validations/task.schema";
import { TaskService } from "@/lib/services/task.service";
import { authService } from "@/lib/services/auth.service";

export const dynamic = "force-dynamic";

const taskService = new TaskService();

/**
 * GET /api/tasks
 * List tasks with optional boardId or assigneeId filters
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const boardId = searchParams.get("boardId") || undefined;
    const assigneeId = searchParams.get("assigneeId") || undefined;

    const tasks = await taskService.listTasks({ boardId, assigneeId });
    return NextResponse.json({ ok: true, data: tasks });
  } catch (err: any) {
    console.error("GET /api/tasks Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch tasks." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks
 * Create a new task with Connected Wedge #3 validation
 */
export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("ems-session")?.value;
    const currentUser = token ? await authService.getSessionUser(token) : null;

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const validation = validateTaskCreateInput(body);

    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    const result = await taskService.createTask(validation.data, currentUser);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: result.data }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/tasks Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to create task." },
      { status: 500 }
    );
  }
}

