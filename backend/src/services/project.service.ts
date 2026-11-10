/**
 * Project and Board Domain Service
 * Layer 3: Domain Service Layer
 */

import { ProjectRepository } from "../repositories/project.repository";
import type { Employee, Project, Board } from "../types";
import { isAdminRole } from "../utils";
import type { ProjectCreateInput } from "../validations/project.schema";

export class ProjectService {
  private projectRepo: ProjectRepository;

  constructor(projectRepo = new ProjectRepository()) {
    this.projectRepo = projectRepo;
  }

  /**
   * List all projects and boards
   */
  async listProjects(): Promise<{ projects: Project[]; boards: Board[] }> {
    return this.projectRepo.findAll();
  }

  /**
   * Get project and board by ID
   */
  async getProject(id: string): Promise<{ project: Project; board?: Board } | null> {
    return this.projectRepo.findById(id);
  }

  /**
   * Create a new project and initialize its Kanban board
   */
  async createProject(input: ProjectCreateInput, actor: Employee): Promise<{ ok: true; data: { project: Project; board: Board } } | { ok: false; error: string }> {
    if (!isAdminRole(actor.role)) {
      return { ok: false, error: "Only administrators can create projects." };
    }

    if (!input.name.trim()) {
      return { ok: false, error: "Project name is required." };
    }

    const result = await this.projectRepo.create(input);
    return { ok: true, data: result };
  }

  /**
   * Update project details
   */
  async updateProject(id: string, patch: Partial<Project>, actor: Employee): Promise<{ ok: true; data: Project } | { ok: false; error: string }> {
    const existing = await this.projectRepo.findById(id);
    if (!existing) {
      return { ok: false, error: "Project not found." };
    }

    // Admins, project lead, or managers can update
    const canEdit = isAdminRole(actor.role) || existing.project.leadId === actor.id;
    if (!canEdit) {
      return { ok: false, error: "You do not have permission to update this project." };
    }

    const updated = await this.projectRepo.update(id, patch);
    if (!updated) {
      return { ok: false, error: "Failed to update project." };
    }

    return { ok: true, data: updated };
  }
}
