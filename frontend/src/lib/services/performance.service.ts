// frontend/src/lib/services/performance.service.ts
// Domain Service for Performance Management & Connected Wedge Objective Work Data Engine

import { performanceRepository } from "../repositories/performance.repository";
import { employeeRepository } from "../repositories/employee.repository";
import { taskRepository } from "../repositories/task.repository";
import { attendanceRepository } from "../repositories/attendance.repository";
import { leaveRepository } from "../repositories/leave.repository";
import type { ReviewCycle, Review, Goal, Employee, DB, ChecklistItem, Task, Attendance, LeaveRequest } from "../types";
import type {
  ReviewCycleCreateInput,
  ReviewSubmitInput,
  PeerFeedbackInput,
  GoalCreateInput,
  GoalUpdateInput,
} from "../validations/performance.schema";
import { uid, isAdminRole, fullName, rangesOverlap, isOverdue } from "../utils";
import type { ServiceResult } from "./leave.service";

export class PerformanceService {
  /* -------------------------- Review Cycles -------------------------- */

  async listCycles(status?: string): Promise<ReviewCycle[]> {
    return performanceRepository.findCycles(status);
  }

  async getCycleById(id: string): Promise<ReviewCycle | null> {
    return performanceRepository.findCycleById(id);
  }

  /**
   * Launch a new review cycle
   * Security: Only Admins can launch a cycle
   * Connected Wedge: Auto-generates review records for all eligible employees pre-assigning their manager as reviewer
   */
  async createCycle(actor: Employee, input: ReviewCycleCreateInput): Promise<ServiceResult<ReviewCycle>> {
    if (!isAdminRole(actor.role)) {
      return { ok: false, error: "Only administrators can launch review cycles." };
    }

    const cycleId = uid("rc");
    const cycle: ReviewCycle = {
      id: cycleId,
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      status: "ACTIVE",
    };

    const savedCycle = await performanceRepository.createCycle(cycle);

    // Auto-generate reviews for all active employees (excluding terminated & onboarding)
    const allEmployees = await employeeRepository.findAll();
    const eligible = allEmployees.filter(
      (e) => e.status !== "TERMINATED" && e.status !== "ONBOARDING"
    );

    const reviews: Review[] = eligible.map((e) => ({
      id: uid("rv"),
      cycleId,
      employeeId: e.id,
      reviewerId: e.managerId || null,
      selfRating: null,
      selfComment: "",
      peerFeedback: [],
      managerRating: null,
      managerComment: "",
      status: "PENDING_SELF",
    }));

    if (reviews.length > 0) {
      await performanceRepository.createReviewsBatch(reviews);
    }

    return { ok: true, data: savedCycle };
  }

  /**
   * Close a review cycle
   * Security: Only Admins can close a cycle
   */
  async closeCycle(actor: Employee, id: string): Promise<ServiceResult<ReviewCycle>> {
    if (!isAdminRole(actor.role)) {
      return { ok: false, error: "Only administrators can close review cycles." };
    }

    const existing = await performanceRepository.findCycleById(id);
    if (!existing) {
      return { ok: false, error: "Review cycle not found." };
    }

    if (existing.status === "CLOSED") {
      return { ok: false, error: "Review cycle is already closed." };
    }

    const updated = await performanceRepository.updateCycleStatus(id, "CLOSED");
    return { ok: true, data: updated! };
  }

  /* ----------------------------- Reviews ----------------------------- */

  async listReviews(
    actor: Employee,
    filters?: { cycleId?: string; employeeId?: string; reviewerId?: string; status?: string }
  ): Promise<Review[]> {
    if (isAdminRole(actor.role)) {
      return performanceRepository.findReviews(filters);
    }

    if (actor.role === "MANAGER") {
      const [all, allEmployees] = await Promise.all([
        performanceRepository.findReviews(filters),
        employeeRepository.findAll(),
      ]);
      const subIds = new Set(allEmployees.filter((e) => e.managerId === actor.id).map((s) => s.id));
      return all.filter((r) => r.employeeId === actor.id || r.reviewerId === actor.id || subIds.has(r.employeeId));
    }

    // Regular employee can only view their own reviews
    return performanceRepository.findReviews({ ...filters, employeeId: actor.id });
  }

  async getReviewById(actor: Employee, id: string): Promise<ServiceResult<Review>> {
    const review = await performanceRepository.findReviewById(id);
    if (!review) {
      return { ok: false, error: "Review not found." };
    }

    const isOwn = review.employeeId === actor.id;
    const isReviewer = review.reviewerId === actor.id;
    const isAdmin = isAdminRole(actor.role);

    if (!isOwn && !isReviewer && !isAdmin) {
      return { ok: false, error: "Unauthorized to access this review." };
    }

    return { ok: true, data: review };
  }

  /**
   * Submit self-assessment review
   */
  async submitSelfReview(
    actor: Employee,
    reviewId: string,
    input: ReviewSubmitInput
  ): Promise<ServiceResult<Review>> {
    const review = await performanceRepository.findReviewById(reviewId);
    if (!review) {
      return { ok: false, error: "Review not found." };
    }

    if (review.employeeId !== actor.id) {
      return { ok: false, error: "You can only submit your own self-assessment." };
    }

    const cycle = await performanceRepository.findCycleById(review.cycleId);
    if (cycle?.status === "CLOSED") {
      return { ok: false, error: "This review cycle is closed." };
    }

    const updated = await performanceRepository.updateReview(reviewId, {
      selfRating: input.rating,
      selfComment: input.comment || "",
      status: review.status === "PENDING_SELF" ? "PENDING_MANAGER" : review.status,
    });

    return { ok: true, data: updated! };
  }

  /**
   * Submit manager assessment review
   */
  async submitManagerReview(
    actor: Employee,
    reviewId: string,
    input: ReviewSubmitInput
  ): Promise<ServiceResult<Review>> {
    const review = await performanceRepository.findReviewById(reviewId);
    if (!review) {
      return { ok: false, error: "Review not found." };
    }

    const isReviewer = review.reviewerId === actor.id;
    const isAdmin = isAdminRole(actor.role);

    if (!isReviewer && !isAdmin) {
      return { ok: false, error: "Only the designated reviewer or an admin can submit the manager review." };
    }

    const cycle = await performanceRepository.findCycleById(review.cycleId);
    if (cycle?.status === "CLOSED") {
      return { ok: false, error: "This review cycle is closed." };
    }

    const updated = await performanceRepository.updateReview(reviewId, {
      managerRating: input.rating,
      managerComment: input.comment || "",
      reviewerId: review.reviewerId || actor.id,
      status: "COMPLETED",
    });

    return { ok: true, data: updated! };
  }

  /**
   * Add peer feedback to review
   */
  async addPeerFeedback(
    actor: Employee,
    reviewId: string,
    input: PeerFeedbackInput
  ): Promise<ServiceResult<Review>> {
    const review = await performanceRepository.findReviewById(reviewId);
    if (!review) {
      return { ok: false, error: "Review not found." };
    }

    if (review.employeeId === actor.id) {
      return { ok: false, error: "You cannot give peer feedback to yourself." };
    }

    const cycle = await performanceRepository.findCycleById(review.cycleId);
    if (cycle?.status === "CLOSED") {
      return { ok: false, error: "This review cycle is closed." };
    }

    const peerFeedback = (review.peerFeedback || []).filter((p) => p.fromId !== actor.id);
    peerFeedback.push({
      fromId: actor.id,
      rating: input.rating,
      comment: input.comment,
    });

    const updated = await performanceRepository.updateReview(reviewId, { peerFeedback });
    return { ok: true, data: updated! };
  }

  /* ------------------------------ Goals ------------------------------ */

  async listGoals(actor: Employee, filters?: { employeeId?: string; status?: string }): Promise<Goal[]> {
    if (isAdminRole(actor.role)) {
      return performanceRepository.findGoals(filters);
    }

    if (actor.role === "MANAGER") {
      const [all, allEmployees] = await Promise.all([
        performanceRepository.findGoals(filters),
        employeeRepository.findAll(),
      ]);
      const subIds = new Set(allEmployees.filter((e) => e.managerId === actor.id).map((s) => s.id));
      return all.filter((g) => g.employeeId === actor.id || subIds.has(g.employeeId));
    }

    // Regular employee: strictly their own goals
    return performanceRepository.findGoals({ ...filters, employeeId: actor.id });
  }

  async createGoal(actor: Employee, input: GoalCreateInput): Promise<ServiceResult<Goal>> {
    const targetEmployeeId = input.employeeId || actor.id;

    if (targetEmployeeId !== actor.id && !isAdminRole(actor.role) && actor.role !== "MANAGER") {
      return { ok: false, error: "You cannot create goals for other employees." };
    }

    // Compute progress automatically if keyResults provided
    let progress = input.progress ?? 0;
    let status = input.status ?? "ON_TRACK";
    const krs: ChecklistItem[] = (input.keyResults || []).map((kr, i) => ({
      id: kr.id || uid("kr"),
      label: kr.label || kr.text || "",
      done: Boolean(kr.done),
    }));

    if (krs.length > 0) {
      const doneCount = krs.filter((k) => k.done).length;
      progress = Math.round((doneCount / krs.length) * 100);
      status = progress === 100 ? "COMPLETED" : status === "COMPLETED" ? "ON_TRACK" : status;
    }

    const goal: Goal = {
      id: uid("g"),
      employeeId: targetEmployeeId,
      title: input.title,
      type: input.type,
      quarter: input.quarter,
      progress,
      status,
      keyResults: krs,
    };

    const saved = await performanceRepository.createGoal(goal);
    return { ok: true, data: saved };
  }

  async updateGoal(actor: Employee, id: string, input: GoalUpdateInput): Promise<ServiceResult<Goal>> {
    const existing = await performanceRepository.findGoalById(id);
    if (!existing) {
      return { ok: false, error: "Goal not found." };
    }

    const isOwner = existing.employeeId === actor.id;
    const isAdmin = isAdminRole(actor.role);

    if (!isOwner && !isAdmin && actor.role !== "MANAGER") {
      return { ok: false, error: "Unauthorized to update this goal." };
    }

    const patch: Partial<Goal> = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.type !== undefined) patch.type = input.type;
    if (input.quarter !== undefined) patch.quarter = input.quarter;
    if (input.progress !== undefined) patch.progress = input.progress;
    if (input.status !== undefined) patch.status = input.status;

    if (input.keyResults !== undefined) {
      const krs: ChecklistItem[] = input.keyResults.map((k, i) => ({
        id: k.id || `kr_${i + 1}`,
        label: k.label || k.text || "",
        done: Boolean(k.done),
      }));
      patch.keyResults = krs;
      if (krs.length > 0) {
        const doneCount = krs.filter((k) => k.done).length;
        patch.progress = Math.round((doneCount / krs.length) * 100);
        patch.status = patch.progress === 100 ? "COMPLETED" : patch.status === "COMPLETED" ? "ON_TRACK" : patch.status || existing.status;
      }
    }

    const updated = await performanceRepository.updateGoal(id, patch);
    return { ok: true, data: updated! };
  }

  async deleteGoal(actor: Employee, id: string): Promise<ServiceResult<boolean>> {
    const existing = await performanceRepository.findGoalById(id);
    if (!existing) {
      return { ok: false, error: "Goal not found." };
    }

    const isOwner = existing.employeeId === actor.id;
    const isAdmin = isAdminRole(actor.role);

    if (!isOwner && !isAdmin) {
      return { ok: false, error: "You can only delete your own goals." };
    }

    const deleted = await performanceRepository.deleteGoal(id);
    return { ok: true, data: deleted };
  }

  /* ---------------- Connected Wedge: Delivery Data ---------------- */

  /**
   * Connected Wedge: Calculates real task delivery and attendance metrics
   * dynamically across a review cycle window for an employee
   */
  async getObjectiveWorkData(employeeId: string, startDate: string, endDate: string) {
    const [tasks, allAttendance, leaves]: [Task[], Attendance[], LeaveRequest[]] = await Promise.all([
      taskRepository.findAll({ assigneeId: employeeId }),
      attendanceRepository.findAll({ employeeId }),
      leaveRepository.findAll({ employeeId, status: "APPROVED" }),
    ]);

    const attendance = allAttendance.filter(
      (a: Attendance) => a.date >= startDate && a.date <= endDate
    );

    const completed = tasks.filter(
      (t: Task) => t.completedAt && t.completedAt.slice(0, 10) >= startDate && t.completedAt.slice(0, 10) <= endDate
    );

    const withDue = completed.filter((t: Task) => t.dueDate);
    const onTime = withDue.filter((t: Task) => t.completedAt!.slice(0, 10) <= t.dueDate!);
    const onTimeRate = withDue.length ? Math.round((onTime.length / withDue.length) * 100) : 100;

    const missedDeadlines = completed.filter((t: Task) => t.dueDate && t.completedAt!.slice(0, 10) > t.dueDate).length;
    const projectsInvolved = new Set(tasks.map((t: Task) => t.boardId)).size;

    const presentDays =
      attendance.filter((a: Attendance) => a.status === "PRESENT" || a.status === "REMOTE").length +
      attendance.filter((a: Attendance) => a.status === "HALF_DAY").length * 0.5;

    const recordedDays = attendance.filter((a: Attendance) => a.status !== "ON_LEAVE").length;
    const attendanceRate = recordedDays ? Math.round((presentDays / recordedDays) * 100) : 100;

    const leaveDays = leaves
      .filter((l: LeaveRequest) => rangesOverlap(l.startDate, l.endDate, startDate, endDate))
      .reduce((sum: number, l: LeaveRequest) => sum + l.days, 0);

    return {
      completedTasks: completed.length,
      onTimeDeliveryRate: onTimeRate,
      missedDeadlines,
      projectsInvolved,
      attendanceRate,
      leaveDaysTaken: leaveDays,
    };
  }
}

export const performanceService = new PerformanceService();
