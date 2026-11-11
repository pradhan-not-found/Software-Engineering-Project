// frontend/src/lib/repositories/performance.repository.ts
// Data Access Layer (DAL) for Performance Cycles, Reviews & Goals

import { supabase, isSupabaseConfigured } from "../supabase";
import type { ReviewCycle, Review, Goal, PeerFeedback, ChecklistItem } from "../types";
import { createSeed } from "../seed";

export interface DBReviewCycleRow {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: "DRAFT" | "ACTIVE" | "CLOSED";
  created_at?: string;
}

export interface DBReviewRow {
  id: string;
  cycle_id: string;
  employee_id: string;
  reviewer_id: string | null;
  self_rating: number | null;
  self_comment: string | null;
  peer_feedback: PeerFeedback[];
  manager_rating: number | null;
  manager_comment: string | null;
  status: "PENDING_SELF" | "PENDING_MANAGER" | "COMPLETED";
  created_at?: string;
}

export interface DBGoalRow {
  id: string;
  employee_id: string;
  title: string;
  type: "OKR" | "KPI";
  quarter: string;
  progress: number;
  status: "ON_TRACK" | "AT_RISK" | "BEHIND" | "COMPLETED";
  key_results: ChecklistItem[];
  created_at?: string;
}

function mapRowToCycle(row: DBReviewCycleRow): ReviewCycle {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
  };
}

function mapRowToReview(row: DBReviewRow): Review {
  return {
    id: row.id,
    cycleId: row.cycle_id,
    employeeId: row.employee_id,
    reviewerId: row.reviewer_id,
    selfRating: row.self_rating,
    selfComment: row.self_comment || "",
    peerFeedback: Array.isArray(row.peer_feedback) ? row.peer_feedback : [],
    managerRating: row.manager_rating,
    managerComment: row.manager_comment || "",
    status: row.status,
  };
}

function mapRowToGoal(row: DBGoalRow): Goal {
  return {
    id: row.id,
    employeeId: row.employee_id,
    title: row.title,
    type: row.type,
    quarter: row.quarter,
    progress: row.progress,
    status: row.status,
    keyResults: Array.isArray(row.key_results)
      ? row.key_results.map((kr: any) => ({
          id: kr.id || "",
          label: kr.label || kr.text || "",
          done: Boolean(kr.done),
        }))
      : [],
  };
}

export class PerformanceRepository {
  private fallbackCycles: ReviewCycle[];
  private fallbackReviews: Review[];
  private fallbackGoals: Goal[];

  constructor() {
    const seed = createSeed();
    this.fallbackCycles = seed.cycles || [];
    this.fallbackReviews = seed.reviews || [];
    this.fallbackGoals = seed.goals || [];
  }

  /* -------------------------- Review Cycles -------------------------- */

  async findCycles(status?: string): Promise<ReviewCycle[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from("review_cycles").select("*");
        if (status && status !== "ALL") {
          query = query.eq("status", status);
        }
        const { data, error } = await query.order("start_date", { ascending: false });
        if (!error && data) {
          return data.map((r) => mapRowToCycle(r as DBReviewCycleRow));
        }
      } catch (err) {
        console.error("Supabase findCycles error:", err);
      }
    }

    let cycles = [...this.fallbackCycles];
    if (status && status !== "ALL") {
      cycles = cycles.filter((c) => c.status === status);
    }
    return cycles;
  }

  async findCycleById(id: string): Promise<ReviewCycle | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from("review_cycles").select("*").eq("id", id).maybeSingle();
        if (!error && data) {
          return mapRowToCycle(data as DBReviewCycleRow);
        }
      } catch (err) {
        console.error("Supabase findCycleById error:", err);
      }
    }

    return this.fallbackCycles.find((c) => c.id === id) || null;
  }

  async createCycle(cycle: ReviewCycle): Promise<ReviewCycle> {
    if (isSupabaseConfigured && supabase) {
      try {
        const row: DBReviewCycleRow = {
          id: cycle.id,
          name: cycle.name,
          start_date: cycle.startDate,
          end_date: cycle.endDate,
          status: cycle.status,
        };
        await supabase.from("review_cycles").insert(row);
      } catch (err) {
        console.error("Supabase createCycle error:", err);
      }
    }

    this.fallbackCycles.unshift(cycle);
    return cycle;
  }

  async updateCycleStatus(id: string, status: "ACTIVE" | "CLOSED"): Promise<ReviewCycle | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("review_cycles").update({ status }).eq("id", id);
      } catch (err) {
        console.error("Supabase updateCycleStatus error:", err);
      }
    }

    const c = this.fallbackCycles.find((x) => x.id === id);
    if (c) {
      c.status = status;
      return c;
    }
    return null;
  }

  /* ----------------------------- Reviews ----------------------------- */

  async findReviews(filters?: {
    cycleId?: string;
    employeeId?: string;
    reviewerId?: string;
    status?: string;
  }): Promise<Review[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from("reviews").select("*");
        if (filters?.cycleId) query = query.eq("cycle_id", filters.cycleId);
        if (filters?.employeeId) query = query.eq("employee_id", filters.employeeId);
        if (filters?.reviewerId) query = query.eq("reviewer_id", filters.reviewerId);
        if (filters?.status && filters.status !== "ALL") query = query.eq("status", filters.status);

        const { data, error } = await query;
        if (!error && data) {
          return data.map((r) => mapRowToReview(r as DBReviewRow));
        }
      } catch (err) {
        console.error("Supabase findReviews error:", err);
      }
    }

    let list = [...this.fallbackReviews];
    if (filters?.cycleId) list = list.filter((r) => r.cycleId === filters.cycleId);
    if (filters?.employeeId) list = list.filter((r) => r.employeeId === filters.employeeId);
    if (filters?.reviewerId) list = list.filter((r) => r.reviewerId === filters.reviewerId);
    if (filters?.status && filters.status !== "ALL") list = list.filter((r) => r.status === filters.status);
    return list;
  }

  async findReviewById(id: string): Promise<Review | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from("reviews").select("*").eq("id", id).maybeSingle();
        if (!error && data) {
          return mapRowToReview(data as DBReviewRow);
        }
      } catch (err) {
        console.error("Supabase findReviewById error:", err);
      }
    }

    return this.fallbackReviews.find((r) => r.id === id) || null;
  }

  async createReviewsBatch(reviews: Review[]): Promise<Review[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const rows: DBReviewRow[] = reviews.map((r) => ({
          id: r.id,
          cycle_id: r.cycleId,
          employee_id: r.employeeId,
          reviewer_id: r.reviewerId,
          self_rating: r.selfRating,
          self_comment: r.selfComment,
          peer_feedback: r.peerFeedback,
          manager_rating: r.managerRating,
          manager_comment: r.managerComment,
          status: r.status,
        }));
        await supabase.from("reviews").insert(rows);
      } catch (err) {
        console.error("Supabase createReviewsBatch error:", err);
      }
    }

    this.fallbackReviews.unshift(...reviews);
    return reviews;
  }

  async updateReview(id: string, patch: Partial<Review>): Promise<Review | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const dbPatch: Partial<DBReviewRow> = {};
        if (patch.selfRating !== undefined) dbPatch.self_rating = patch.selfRating;
        if (patch.selfComment !== undefined) dbPatch.self_comment = patch.selfComment;
        if (patch.peerFeedback !== undefined) dbPatch.peer_feedback = patch.peerFeedback;
        if (patch.managerRating !== undefined) dbPatch.manager_rating = patch.managerRating;
        if (patch.managerComment !== undefined) dbPatch.manager_comment = patch.managerComment;
        if (patch.reviewerId !== undefined) dbPatch.reviewer_id = patch.reviewerId;
        if (patch.status !== undefined) dbPatch.status = patch.status;

        await supabase.from("reviews").update(dbPatch).eq("id", id);
      } catch (err) {
        console.error("Supabase updateReview error:", err);
      }
    }

    const r = this.fallbackReviews.find((x) => x.id === id);
    if (r) {
      Object.assign(r, patch);
      return r;
    }
    return null;
  }

  /* ------------------------------ Goals ------------------------------ */

  async findGoals(filters?: {
    employeeId?: string;
    status?: string;
  }): Promise<Goal[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from("goals").select("*");
        if (filters?.employeeId) query = query.eq("employee_id", filters.employeeId);
        if (filters?.status && filters.status !== "ALL") query = query.eq("status", filters.status);

        const { data, error } = await query;
        if (!error && data) {
          return data.map((g) => mapRowToGoal(g as DBGoalRow));
        }
      } catch (err) {
        console.error("Supabase findGoals error:", err);
      }
    }

    let list = [...this.fallbackGoals];
    if (filters?.employeeId) list = list.filter((g) => g.employeeId === filters.employeeId);
    if (filters?.status && filters.status !== "ALL") list = list.filter((g) => g.status === filters.status);
    return list;
  }

  async findGoalById(id: string): Promise<Goal | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from("goals").select("*").eq("id", id).maybeSingle();
        if (!error && data) {
          return mapRowToGoal(data as DBGoalRow);
        }
      } catch (err) {
        console.error("Supabase findGoalById error:", err);
      }
    }

    return this.fallbackGoals.find((g) => g.id === id) || null;
  }

  async createGoal(goal: Goal): Promise<Goal> {
    if (isSupabaseConfigured && supabase) {
      try {
        const row: DBGoalRow = {
          id: goal.id,
          employee_id: goal.employeeId,
          title: goal.title,
          type: goal.type,
          quarter: goal.quarter,
          progress: goal.progress,
          status: goal.status,
          key_results: goal.keyResults,
        };
        await supabase.from("goals").insert(row);
      } catch (err) {
        console.error("Supabase createGoal error:", err);
      }
    }

    this.fallbackGoals.unshift(goal);
    return goal;
  }

  async updateGoal(id: string, patch: Partial<Goal>): Promise<Goal | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const dbPatch: Partial<DBGoalRow> = {};
        if (patch.title !== undefined) dbPatch.title = patch.title;
        if (patch.type !== undefined) dbPatch.type = patch.type;
        if (patch.quarter !== undefined) dbPatch.quarter = patch.quarter;
        if (patch.progress !== undefined) dbPatch.progress = patch.progress;
        if (patch.status !== undefined) dbPatch.status = patch.status;
        if (patch.keyResults !== undefined) dbPatch.key_results = patch.keyResults;

        await supabase.from("goals").update(dbPatch).eq("id", id);
      } catch (err) {
        console.error("Supabase updateGoal error:", err);
      }
    }

    const g = this.fallbackGoals.find((x) => x.id === id);
    if (g) {
      Object.assign(g, patch);
      return g;
    }
    return null;
  }

  async deleteGoal(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("goals").delete().eq("id", id);
      } catch (err) {
        console.error("Supabase deleteGoal error:", err);
      }
    }

    const index = this.fallbackGoals.findIndex((g) => g.id === id);
    if (index !== -1) {
      this.fallbackGoals.splice(index, 1);
      return true;
    }
    return false;
  }
}

export const performanceRepository = new PerformanceRepository();
