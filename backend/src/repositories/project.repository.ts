/**
 * Project and Board Data Access Layer (DAL)
 * Layer 4: Repository Layer
 */

import { supabase, isSupabaseConfigured } from "../supabase";
import type { Project, Board, ColumnCategory } from "../types";
import { createSeed, defaultColumns } from "../seed";
import { uid } from "../utils";
import type { ProjectCreateInput } from "../validations/project.schema";

export class ProjectRepository {
  /**
   * List all projects and associated boards
   */
  async findAll(): Promise<{ projects: Project[]; boards: Board[] }> {
    if (isSupabaseConfigured && supabase) {
      try {
        const [{ data: pRows, error: pErr }, { data: bRows, error: bErr }, { data: cRows, error: cErr }] =
          await Promise.all([
            supabase.from("projects").select("*").order("name"),
            supabase.from("boards").select("*"),
            supabase.from("board_columns").select("*").order("order_index"),
          ]);

        if (!pErr && pRows && !bErr && bRows) {
          const boards: Board[] = bRows.map((b: any) => ({
            id: b.id,
            title: b.title,
            type: b.type,
            projectId: b.project_id,
            ownerId: b.owner_id,
            createdAt: b.created_at,
            columns: (cRows || [])
              .filter((c: any) => c.board_id === b.id)
              .map((c: any) => ({
                id: c.id,
                name: c.name,
                category: c.category as ColumnCategory,
              })),
          }));

          const projects: Project[] = pRows.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description || "",
            color: p.color || "blue",
            leadId: p.lead_id,
            departmentId: p.department_id || "d_eng",
            status: p.status,
            startDate: p.start_date || new Date().toISOString().slice(0, 10),
            endDate: p.end_date || new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
          }));

          return { projects, boards };
        }
      } catch (err) {
        console.error("Supabase findAll projects error:", err);
      }
    }

    // In-memory demo fallback
    const seed = createSeed();
    return {
      projects: seed.projects,
      boards: seed.boards,
    };
  }

  /**
   * Find project by ID with associated board
   */
  async findById(id: string): Promise<{ project: Project; board?: Board } | null> {
    const { projects, boards } = await this.findAll();
    const project = projects.find((p) => p.id === id);
    if (!project) return null;
    const board = boards.find((b) => b.projectId === id);
    return { project, board };
  }

  /**
   * Create a project, an associated board, and default 4-stage Kanban columns
   */
  async create(input: ProjectCreateInput): Promise<{ project: Project; board: Board }> {
    const projectId = uid("p");
    const boardId = uid("b");
    const now = new Date().toISOString();
    const todayStr = now.slice(0, 10);
    const futureStr = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

    const project: Project = {
      id: projectId,
      name: input.name,
      description: input.description || "",
      color: input.color || "blue",
      leadId: input.leadId,
      departmentId: input.departmentId || "d_eng",
      status: input.status,
      startDate: input.startDate || todayStr,
      endDate: input.endDate || futureStr,
    };

    const boardCols = defaultColumns(boardId);
    const board: Board = {
      id: boardId,
      title: project.name,
      type: "PROJECT",
      projectId: project.id,
      ownerId: null,
      columns: boardCols,
      createdAt: now,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("projects").insert({
          id: project.id,
          name: project.name,
          code: project.name.slice(0, 4).toUpperCase(),
          description: project.description,
          color: project.color,
          lead_id: project.leadId,
          department_id: project.departmentId,
          status: project.status,
          start_date: project.startDate,
          end_date: project.endDate,
          created_at: now,
        });

        await supabase.from("boards").insert({
          id: board.id,
          title: board.title,
          type: board.type,
          project_id: board.projectId,
          owner_id: board.ownerId,
          created_at: now,
        });

        const columnInserts = board.columns.map((col, idx) => ({
          id: col.id,
          board_id: board.id,
          name: col.name,
          category: col.category,
          order_index: idx,
        }));
        await supabase.from("board_columns").insert(columnInserts);
      } catch (err) {
        console.error("Supabase create project error:", err);
      }
    }

    return { project, board };
  }

  /**
   * Update project fields
   */
  async update(id: string, patch: Partial<Project>): Promise<Project | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const updatePayload: Record<string, any> = {};
        if (patch.name !== undefined) updatePayload.name = patch.name;
        if (patch.description !== undefined) updatePayload.description = patch.description;
        if (patch.color !== undefined) updatePayload.color = patch.color;
        if (patch.status !== undefined) updatePayload.status = patch.status;
        if (patch.startDate !== undefined) updatePayload.start_date = patch.startDate;
        if (patch.endDate !== undefined) updatePayload.end_date = patch.endDate;

        const { data, error } = await supabase
          .from("projects")
          .update(updatePayload)
          .eq("id", id)
          .select("*")
          .single();

        if (!error && data) {
          if (patch.name) {
            await supabase.from("boards").update({ title: patch.name }).eq("project_id", id);
          }
          return {
            id: data.id,
            name: data.name,
            description: data.description || "",
            color: data.color || "blue",
            leadId: data.lead_id,
            departmentId: data.department_id || "d_eng",
            status: data.status,
            startDate: data.start_date || new Date().toISOString().slice(0, 10),
            endDate: data.end_date || new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
          };
        }
      } catch (err) {
        console.error("Supabase update project error:", err);
      }
    }

    const { project } = (await this.findById(id)) || {};
    if (!project) return null;
    return Object.assign(project, patch);
  }
}
