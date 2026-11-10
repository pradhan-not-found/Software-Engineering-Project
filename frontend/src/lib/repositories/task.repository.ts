/**
 * Tasks Data Access Layer (DAL)
 * Layer 4: Repository Layer
 */

import { supabase, isSupabaseConfigured } from "../supabase";
import type { Task, Priority, Recurrence } from "../types";
import { createSeed } from "../seed";

export class TaskRepository {
  /**
   * List tasks with optional board / assignee filters
   */
  async findAll(filter?: { boardId?: string; assigneeId?: string }): Promise<Task[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let taskQuery = supabase.from("tasks").select("*");
        if (filter?.boardId) {
          taskQuery = taskQuery.eq("board_id", filter.boardId);
        }

        const [{ data: tRows, error: tErr }, { data: aRows, error: aErr }] = await Promise.all([
          taskQuery.order("order_index"),
          supabase.from("task_assignees").select("*"),
        ]);

        if (!tErr && tRows) {
          let tasks: Task[] = tRows.map((t: any) => {
            const assignees = (aRows || [])
              .filter((a: any) => a.task_id === t.id)
              .map((a: any) => a.employee_id);

            return {
              id: t.id,
              boardId: t.board_id,
              columnId: t.column_id,
              title: t.title,
              description: t.description || "",
              priority: (t.priority as Priority) || "MEDIUM",
              dueDate: t.due_date || null,
              assigneeIds: assignees,
              creatorId: t.creator_id || "",
              flag: t.flag || "NORMAL",
              recurrence: (t.recurrence as Recurrence) || "NONE",
              tags: t.tags || [],
              comments: t.comments || [],
              attachments: t.attachments || [],
              createdAt: t.created_at,
              completedAt: t.completed_at || null,
              order: t.order_index ?? 0,
            };
          });

          if (filter?.assigneeId) {
            tasks = tasks.filter((t) => t.assigneeIds.includes(filter.assigneeId!));
          }

          return tasks;
        }
      } catch (err) {
        console.error("Supabase findAll tasks error:", err);
      }
    }

    // In-memory demo fallback
    const seed = createSeed();
    let tasks = seed.tasks;
    if (filter?.boardId) {
      tasks = tasks.filter((t) => t.boardId === filter.boardId);
    }
    if (filter?.assigneeId) {
      tasks = tasks.filter((t) => t.assigneeIds.includes(filter.assigneeId!));
    }
    return tasks;
  }

  /**
   * Find single task by ID
   */
  async findById(id: string): Promise<Task | null> {
    const tasks = await this.findAll();
    return tasks.find((t) => t.id === id) || null;
  }

  /**
   * Create new task with assignees
   */
  async create(task: Task): Promise<Task> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("tasks").insert({
          id: task.id,
          board_id: task.boardId,
          column_id: task.columnId,
          title: task.title,
          description: task.description,
          priority: task.priority,
          due_date: task.dueDate,
          creator_id: task.creatorId,
          flag: task.flag,
          recurrence: task.recurrence,
          tags: task.tags,
          comments: task.comments,
          attachments: task.attachments,
          order_index: task.order,
          created_at: task.createdAt,
          completed_at: task.completedAt,
        });

        if (task.assigneeIds.length > 0) {
          const assigneeInserts = task.assigneeIds.map((empId) => ({
            task_id: task.id,
            employee_id: empId,
          }));
          await supabase.from("task_assignees").insert(assigneeInserts);
        }
      } catch (err) {
        console.error("Supabase create task error:", err);
      }
    }

    return task;
  }

  /**
   * Update task fields (e.g. column, priority, assignees, flags)
   */
  async update(id: string, patch: Partial<Task>): Promise<Task | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const payload: Record<string, any> = {};
        if (patch.title !== undefined) payload.title = patch.title;
        if (patch.description !== undefined) payload.description = patch.description;
        if (patch.columnId !== undefined) payload.column_id = patch.columnId;
        if (patch.priority !== undefined) payload.priority = patch.priority;
        if (patch.dueDate !== undefined) payload.due_date = patch.dueDate;
        if (patch.flag !== undefined) payload.flag = patch.flag;
        if (patch.order !== undefined) payload.order_index = patch.order;
        if (patch.completedAt !== undefined) payload.completed_at = patch.completedAt;
        if (patch.comments !== undefined) payload.comments = patch.comments;
        if (patch.attachments !== undefined) payload.attachments = patch.attachments;

        if (Object.keys(payload).length > 0) {
          await supabase.from("tasks").update(payload).eq("id", id);
        }

        if (patch.assigneeIds !== undefined) {
          await supabase.from("task_assignees").delete().eq("task_id", id);
          if (patch.assigneeIds.length > 0) {
            await supabase.from("task_assignees").insert(
              patch.assigneeIds.map((empId) => ({ task_id: id, employee_id: empId }))
            );
          }
        }
      } catch (err) {
        console.error("Supabase update task error:", err);
      }
    }

    const task = await this.findById(id);
    if (!task) return null;
    return Object.assign(task, patch);
  }

  /**
   * Delete a task
   */
  async delete(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("task_assignees").delete().eq("task_id", id);
        const { error } = await supabase.from("tasks").delete().eq("id", id);
        return !error;
      } catch (err) {
        console.error("Supabase delete task error:", err);
        return false;
      }
    }
    return true;
  }
}

