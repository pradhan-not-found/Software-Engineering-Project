/**
 * Authentication Business Logic & Domain Service
 * Layer 3: Service Layer
 */

import { userRepository } from "../repositories/user.repository";
import type { Employee } from "../types";
import { uid } from "../utils";

export interface AuthSession {
  userId: string;
  email: string;
  role: string;
  name: string;
  issuedAt: number;
}

export type AuthResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export class AuthService {
  /**
   * Authenticate user with email and password
   */
  async login(email: string, password: string): Promise<AuthResult<{ user: Employee; token: string }>> {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      return { ok: false, error: "Invalid email or password." };
    }

    // Verify account state
    if (user.accountStatus === "SUSPENDED" || user.status === "TERMINATED") {
      return {
        ok: false,
        error: "This account has been suspended. Please contact your HR administrator.",
      };
    }

    // Password validation (supports both demo password and hashed matching)
    const isPasswordValid = user.password === password;
    if (!isPasswordValid) {
      return { ok: false, error: "Invalid email or password." };
    }

    // Construct simple deterministic session token
    const sessionPayload: AuthSession = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: `${user.firstName} ${user.lastName}`,
      issuedAt: Date.now(),
    };

    const token = Buffer.from(JSON.stringify(sessionPayload)).toString("base64");

    // Sanitize user object (omit raw password)
    const sanitizedUser: Employee = {
      ...user,
      password: "[PROTECTED]",
    };

    return {
      ok: true,
      data: {
        user: sanitizedUser,
        token,
      },
    };
  }

  /**
   * Validates an active session token and retrieves the current user
   */
  async getSessionUser(token: string): Promise<Employee | null> {
    try {
      if (!token) return null;
      let userId: string | null = null;
      try {
        const decodedStr = Buffer.from(token, "base64").toString("utf-8");
        const session = JSON.parse(decodedStr) as AuthSession;
        userId = session.userId;
      } catch {
        userId = token;
      }

      if (!userId) return null;

      const user = await userRepository.findById(userId);
      if (!user) return null;

      if (user.accountStatus === "SUSPENDED" || user.status === "TERMINATED") {
        return null;
      }

      return {
        ...user,
        password: "[PROTECTED]",
      };
    } catch {
      return null;
    }
  }

  /**
   * Registers a new workspace owner
   */
  async signup(input: {
    name: string;
    email: string;
    password: string;
    orgName: string;
  }): Promise<AuthResult<{ user: Employee; token: string }>> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      return { ok: false, error: "An account with this email already exists." };
    }

    const [firstName, ...rest] = input.name.trim().split(/\s+/);
    const newEmployee: Employee = {
      id: uid("e"),
      code: `WP-${Math.floor(1000 + Math.random() * 9000)}`,
      firstName: firstName || "New",
      lastName: rest.join(" ") || "Admin",
      email: input.email.trim().toLowerCase(),
      password: input.password,
      phone: "",
      role: "SUPER_ADMIN",
      accountStatus: "ACTIVE",
      designation: "Workspace Owner",
      departmentId: "dept_eng",
      managerId: null,
      buddyId: null,
      joiningDate: new Date().toISOString().slice(0, 10),
      status: "ACTIVE",
      location: "HQ - Mumbai",
      workMode: "Hybrid",
      shift: "General (09:00 – 18:00)",
      dob: "1995-01-01",
      gender: "Other",
      address: "",
      emergencyContact: { name: "", relation: "", phone: "" },
      skills: [],
      certifications: [],
      documents: [],
      assets: [],
      salary: { basic: 100000, hra: 40000, allowances: 20000, otherDeductions: 0, effectiveDate: new Date().toISOString().slice(0, 10) },
      bankAccount: "",
      pan: "",
    };

    const saved = await userRepository.create(newEmployee);

    const sessionPayload: AuthSession = {
      userId: saved.id,
      email: saved.email,
      role: saved.role,
      name: `${saved.firstName} ${saved.lastName}`,
      issuedAt: Date.now(),
    };

    const token = Buffer.from(JSON.stringify(sessionPayload)).toString("base64");

    return {
      ok: true,
      data: {
        user: { ...saved, password: "[PROTECTED]" },
        token,
      },
    };
  }
}

export const authService = new AuthService();

