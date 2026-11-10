/**
 * Tasks Domain Service
 * Layer 3: Domain Service Layer
 * Implements Connected Wedge #3: Org Chart -> Task Permissions & HR Leave Delay Flags
 */

import { TaskRepository } from "../repositories/task.repository";
import { ProjectRepository } from "../repositories/project.repository";
import { EmployeeRepository } from "../repositories/employee.repository";
import { LeaveRepository } from "../repositories/leave.repository";
import type { Task, Employee, BoardColumn, ColumnCategory } from "../types";
import { canManageTasksFor, getSubordinates, fullName, uid, addDays, today, isAdminRole } from "../utils";
import type { TaskCreateInput, TaskPatchInput } from "../validations/task.schema";

export class TaskService {
  private taskRepo: TaskRepository;
  private projectRepo: ProjectRepository;
  private employeeRepo: EmployeeRepository;
  private leaveRepo: LeaveRepository;

  constructor(
    taskRepo = new TaskRepository(),
    projectRepo = new ProjectRepository(),
    employeeRepo = new EmployeeRepository(),
    leaveRepo = new LeaveRepository(),
  ) {
    this.taskRepo = taskRepo;
    this.projectRepo = projectRepo;
    this.employeeRepo = employeeRepo;
    this.leaveRepo = leaveRepo;
  }

  /**
   * List tasks for board, assignee, or visible tree
   */
  async listTasks(filter?: { boardId?: string; assigneeId?: string }): Promise<Task[]> {
    return this.taskRepo.findAll(filter);
  }

  /**
   * Get single task by ID
   */
  async getTask(id: string): Promise<Task | null> {
    return this.taskRepo.findById(id);
  }

  /**
   * Create task with Connected Wedge #3: Org chart permission + HR Leave Awareness
   */
  async createTask(input: TaskCreateInput, actor: Employee): Promise<{ ok: true; data: Task } | { ok: false; error: string }> {
    const employees = await this.employeeRepo.findAll();

    // 1. Connected Wedge #3: Org chart -> task permission check
    for (const assigneeId of input.assigneeIds) {
      if (!canManageTasksFor(employees, actor, assigneeId)) {
        const target = employees.find((e) => e.id === assigneeId);
        return {
          ok: false,
          error: `You can't assign work to ${fullName(target)} — they are outside your reporting line.`,
        };
      }
    }

    // 2. Resolve Board and Column
    const { boards } = await this.projectRepo.findAll();
    const board = boards.find((b) => b.id === input.boardId);
    if (!board) {
      return { ok: false, error: "Board not found." };
    }

    const columnId = input.columnId && board.columns.some((c) => c.id === input.columnId)
      ? input.columnId
      : board.columns[0]?.id || "c_todo";

    const now = new Date().toISOString();
    const taskId = uid("t");

    const task: Task = {
      id: taskId,
      boardId: board.id,
      columnId,
      title: input.title,
      description: input.description || "",
      priority: input.priority,
      dueDate: input.dueDate || null,
      assigneeIds: input.assigneeIds,
      creatorId: actor.id,
      flag: "NORMAL",
      recurrence: input.recurrence || "NONE",
      tags: input.tags || [],
      comments: [],
      attachments: [],
      createdAt: now,
      completedAt: null,
      order: Date.now(),
    };

    // 3. HR Leave Awareness: Flag if assignee has approved leave on due date
    if (task.dueDate && task.assigneeIds.length > 0) {
      const leaves = await this.leaveRepo.findAll({ status: "APPROVED" });
      const onLeave = task.assigneeIds.some((assigneeId) =>
        leaves.some(
          (l) => l.employeeId === assigneeId && l.startDate <= task.dueDate! && l.endDate >= today()
        )
      );
      if (onLeave) {
        task.flag = "DELAYED_ON_LEAVE";
      }
    }

    const created = await this.taskRepo.create(task);
    return { ok: true, data: created };
  }

  /**
   * Move task across or within Kanban columns with Done-state transition & recurrence trigger
   */
  async moveTask(
    taskId: string,
    targetColumnId: string,
    beforeId: string | null = null,
    actor?: Employee
  ): Promise<{ ok: true; data: Task; spawnedNext?: Task } | { ok: false; error: string }> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) return { ok: false, error: "Task not found." };

    const { boards } = await this.projectRepo.findAll();
    const board = boards.find((b) => b.id === task.boardId);
    const targetColumn = board?.columns.find((c) => c.id === targetColumnId);

    if (!board || !targetColumn) {
      return { ok: false, error: "Target board or column not found." };
    }

    const currentColumn = board.columns.find((c) => c.id === task.columnId);
    const wasDone = currentColumn?.category === "done";
    const nowDone = targetColumn.category === "done";

    task.columnId = targetColumnId;

    let spawnedNext: Task | undefined;

    if (nowDone && !wasDone) {
      task.completedAt = new Date().toISOString();
      if (task.flag === "DELAYED_ON_LEAVE") {
        task.flag = "NORMAL";
      }

      // If task has recurrence, schedule next occurrence
      if (task.recurrence !== "NONE") {
        const step = task.recurrence === "DAILY" ? 1 : 7;
        const nextTask: Task = {
          ...structuredClone(task),
          id: uid("t"),
          columnId: board.columns[0]?.id || targetColumnId,
          dueDate: addDays(task.dueDate || today(), step),
          completedAt: null,
          comments: [],
          attachments: [],
          createdAt: new Date().toISOString(),
          order: Date.now(),
        };
        await this.taskRepo.create(nextTask);
        spawnedNext = nextTask;
      }
    } else if (!nowDone && wasDone) {
      task.completedAt = null;
    }

    await this.taskRepo.update(taskId, {
      columnId: task.columnId,
      completedAt: task.completedAt,
      flag: task.flag,
      order: Date.now(),
    });

    return { ok: true, data: task, spawnedNext };
  }

  /**
   * Update task metadata (priority, description, title, assignees)
   */
  async updateTask(taskId: string, patch: TaskPatchInput, actor: Employee): Promise<{ ok: true; data: Task } | { ok: false; error: string }> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) return { ok: false, error: "Task not found." };

    // If assignees are changing, verify org chart reporting permission
    if (patch.assigneeIds) {
      const employees = await this.employeeRepo.findAll();
      for (const aId of patch.assigneeIds) {
        if (!task.assigneeIds.includes(aId) && !canManageTasksFor(employees, actor, aId)) {
          const target = employees.find((e) => e.id === aId);
          return {
            ok: false,
            error: `You can't assign work to ${fullName(target)} — outside your reporting line.`,
          };
        }
      }
    }

    const updated = await this.taskRepo.update(taskId, patch);
    if (!updated) return { ok: false, error: "Failed to update task." };

    return { ok: true, data: updated };
  }

  /**
   * Add comment to task
   */
  async addComment(taskId: string, text: string, actor: Employee): Promise<{ ok: true; comment: any } | { ok: false; error: string }> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) return { ok: false, error: "Task not found." };

    const comment = {
      id: uid("c"),
      authorId: actor.id,
      text: text.trim(),
      at: new Date().toISOString(),
    };

    const comments = [...(task.comments || []), comment];
    await this.taskRepo.update(taskId, { comments });

    return { ok: true, comment };
  }

  /**
   * Delete task
   */
  async deleteTask(taskId: string, actor: Employee): Promise<{ ok: true } | { ok: false; error: string }> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) return { ok: false, error: "Task not found." };

    const canDelete = isAdminRole(actor.role) || task.creatorId === actor.id;
    if (!canDelete) {
      return { ok: false, error: "Only task creator or admins can delete tasks." };
    }

    await this.taskRepo.delete(taskId);
    return { ok: true };
  }

  /**
   * Reassign task (e.g. suggested cover from leave or workload rebalancing)
   */
  async reassignTask(
    taskId: string,
    fromId: string,
    toId: string,
    actor: Employee
  ): Promise<{ ok: true; data: Task } | { ok: false; error: string }> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) return { ok: false, error: "Task not found." };

    const employees = await this.employeeRepo.findAll();
    const from = employees.find((e) => e.id === fromId);
    const to = employees.find((e) => e.id === toId);

    if (!from || !to) return { ok: false, error: "Employee not found." };

    const coverPeer =
      from.departmentId === to.departmentId ||
      (from.managerId && from.managerId === to.managerId);

    const hasPermission =
      canManageTasksFor(employees, actor, toId) ||
      (coverPeer && canManageTasksFor(employees, actor, fromId));

    if (!hasPermission) {
      return { ok: false, error: `${fullName(to)} is outside your reporting line.` };
    }

    const updatedAssignees = Array.from(new Set(task.assigneeIds.filter((a) => a !== fromId).concat(toId)));
    const auditComment = {
      id: uid("c"),
      authorId: actor.id,
      text: `Reassigned from ${fullName(from)} to ${fullName(to)}.`,
      at: new Date().toISOString(),
    };

    const updated = await this.taskRepo.update(taskId, {
      assigneeIds: updatedAssignees,
      flag: "NORMAL",
      comments: [...(task.comments || []), auditComment],
    });

    return { ok: true, data: updated! };
  }
}
