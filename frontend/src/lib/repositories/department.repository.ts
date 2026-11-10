/**
 * Department Data Access Layer (DAL)
 * Layer 4: Repository Layer
 */

import { supabase, isSupabaseConfigured } from "../supabase";
import type { Department } from "../types";
import { createSeed } from "../seed";

export class DepartmentRepository {
  async findAll(): Promise<Department[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from("departments").select("*");
        if (!error && data) {
          return data.map((d: any) => ({
            id: d.id,
            name: d.name,
            code: d.code,
            headId: d.head_id,
            color: d.color || "blue",
          }));
        }
      } catch (err) {
        console.error("Supabase findAll departments error:", err);
      }
    }

    return createSeed().departments;
  }
}

export const departmentRepository = new DepartmentRepository();
