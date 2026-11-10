/**
 * Employee Domain Service & Connected Wedge Engine
 * Layer 3: Service Layer
 */

import { employeeRepository } from "../repositories/employee.repository";
import type { Employee, Board, BoardColumn, Task, Priority } from "../types";
import type { NewHireDTO } from "../validations/employee.schema";
import { uid, addDays, defaultColumns, DEMO_PASSWORD } from "../utils";

export class EmployeeService {
  /**
   * Get all employees with optional filters
   */
  async listEmployees(filters?: { departmentId?: string; status?: string; search?: string }) {
    return employeeRepository.findAll(filters);
  }

  /**
   * Get employee by ID
   */
  async getEmployeeById(id: string) {
    return employeeRepository.findById(id);
  }

  /**
   * Atomic New Hire Onboarding Workflow (The Connected Wedge #1)
   */
  async hireEmployee(input: NewHireDTO, actorId: string | null = null): Promise<{
    employee: Employee;
    board: Board;
    tasks: Task[];
  }> {
    const id = uid("e");
    const boardId = uid("b");
    const join = input.joiningDate || new Date().toISOString().slice(0, 10);

    // 1. Construct Domain Employee Model
    const employee: Employee = {
      id,
      code: `WP-${Math.floor(1000 + Math.random() * 9000)}`,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim().toLowerCase(),
      password: DEMO_PASSWORD,
      phone: input.phone,
      role: input.role,
      accountStatus: "ACTIVE",
      designation: input.designation,
      departmentId: input.departmentId,
      managerId: input.managerId,
      buddyId: input.buddyId,
      joiningDate: join,
      status: "ONBOARDING",
      location: input.location,
      workMode: input.workMode,
      shift: "General (09:00 – 18:00)",
      dob: "1995-01-01",
      gender: input.gender,
      address: "",
      emergencyContact: { name: "", relation: "", phone: "" },
      skills: [],
      certifications: [],
      documents: [],
      assets: input.assets.map((type, i) => ({
        id: uid("as"),
        type,
        tag: `${type.slice(0, 2).toUpperCase()}-${Math.floor(1000 + Math.random() * 8999)}${i}`,
        assignedAt: join,
        returned: false,
      })),
      salary: {
        basic: input.basicSalary,
        hra: Math.round(input.basicSalary * 0.4),
        allowances: Math.round(input.basicSalary * 0.2),
        otherDeductions: 0,
        effectiveDate: join,
      },
      bankAccount: "",
      pan: "",
      onboarding: {
        boardId,
        offerLetterStatus: "SENT",
        welcomeEmailSent: true,
        documentsRequired: [
          { id: uid("dr"), label: "Signed offer letter", done: false },
          { id: uid("dr"), label: "Government ID proof", done: false },
          { id: uid("dr"), label: "Address proof", done: false },
          { id: uid("dr"), label: "Education certificates", done: false },
          { id: uid("dr"), label: "Bank account details", done: false },
        ],
      },
    };

    // 2. Connected Wedge: Auto-generate Onboarding Kanban Board & Tasks
    const columns: BoardColumn[] = defaultColumns(boardId);
    const board: Board = {
      id: boardId,
      title: `Onboarding · ${employee.firstName} ${employee.lastName}`,
      type: "ONBOARDING",
      projectId: null,
      ownerId: id,
      columns,
      createdAt: new Date().toISOString(),
    };

    const hr = actorId ?? "emp_arjun";
    const mgr = input.managerId ?? hr;
    const buddy = input.buddyId ?? mgr;

    const template: [string, string, string | null, Priority, number][] = [
      ["IT", "Provision laptop, email & tool accounts", hr, "HIGH", 0],
      ["HR", "Send offer letter & collect documents", hr, "HIGH", 0],
      ["HR", "Verify documents & activate payroll", hr, "HIGH", 3],
      ["Manager", "Introductory 1:1 & team welcome meeting", mgr, "HIGH", 1],
      ["Manager", "Define 30-60-90 day performance goals", mgr, "MEDIUM", 5],
      ["Buddy", "Welcome lunch & tools walkthrough", buddy, "MEDIUM", 2],
      ["Employee", "Upload ID & address proof", id, "HIGH", 1],
      ["Employee", "Complete compliance & security training", id, "MEDIUM", 7],
      ["Employee", "Set up workstation & development environment", id, "MEDIUM", 2],
    ];

    const tasks: Task[] = template.map(([tag, title, assignee, priority, offset], i) => ({
      id: uid("t"),
      boardId,
      columnId: columns[0].id,
      title: `[${tag}] ${title}`,
      description: `Auto-generated onboarding step for ${employee.firstName} ${employee.lastName}.`,
      priority,
      dueDate: addDays(join, offset),
      assigneeIds: assignee ? [assignee] : [],
      creatorId: hr,
      flag: "NORMAL",
      recurrence: "NONE",
      tags: [tag],
      comments: [],
      attachments: [],
      createdAt: new Date().toISOString(),
      completedAt: null,
      order: i,
    }));

    // 3. Persist everything to database
    await employeeRepository.create(employee);
    await employeeRepository.saveOnboardingBoard(board, columns, tasks);

    return { employee, board, tasks };
  }

  /**
   * Update existing employee details
   */
  async updateEmployee(id: string, patch: Partial<Employee>) {
    return employeeRepository.update(id, patch);
  }
}

export const employeeService = new EmployeeService();

