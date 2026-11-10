import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateProjectCreateInput } from "@/lib/validations/project.schema";
import { ProjectService } from "@/lib/services/project.service";
import { authService } from "@/lib/services/auth.service";

export const dynamic = "force-dynamic";

const projectService = new ProjectService();

/**
 * GET /api/projects
 * List all projects and associated boards
 */
export async function GET() {
  try {
    const data = await projectService.listProjects();
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("GET /api/projects Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch projects." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 * Create a new project + Kanban board
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
    const validation = validateProjectCreateInput(body);

    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    const result = await projectService.createProject(validation.data, currentUser);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: result.data }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/projects Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to create project." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects
 * Update an existing project
 */
export async function PATCH(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("ems-session")?.value;
    const currentUser = token ? await authService.getSessionUser(token) : null;

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.id !== "string" || !body.id.trim()) {
      return NextResponse.json({ ok: false, error: "Project ID is required." }, { status: 400 });
    }

    const { id, ...patch } = body;
    const result = await projectService.updateProject(id, patch, currentUser);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (err: any) {
    console.error("PATCH /api/projects Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to update project." },
      { status: 500 }
    );
  }
}
