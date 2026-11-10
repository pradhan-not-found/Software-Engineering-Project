"use client";

/**
 * Client-side data store for the Workplace EMS frontend.
 *
 * Acts as an in-browser mock backend (persisted to localStorage) that
 * implements every domain action the UI needs, including the "Connected
 * Wedge" reactions between HR and work data. Each action maps 1:1 onto a
 * future API route / domain service described in src/database_planning.md.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type {
  ActivityLog,
  AccountStatus,
  Asset,
  Attendance,
  AttendanceStatus,
  Board,
  ColumnCategory,
  DB,
  Employee,
  EmployeeDocument,
  Expense,
  Goal,
  LeaveRequest,
  LeaveTypeKey,
  ModuleKey,
  Notification,
  NotificationCategory,
  OrgSettings,
  PayrollRun,
  Priority,
  Project,
  Recurrence,
  Role,
  SalaryStructure,
  Task,
  Timesheet,
} from "./types";
import { createSeed, DB_VERSION, DEMO_PASSWORD, defaultColumns } from "./seed";
import { isSupabaseConfigured } from "./supabase";
import {
  loadFromSupabase,
  syncEmployeeToSupabase,
  syncTaskToSupabase,
  syncLeaveDecisionToSupabase,
} from "./supabaseSync";
import {
  addDays,
  canManageTasksFor,
  computePayrollLine,
  fullName,
  getSubordinates,
  isAdminRole,
  isOnLeave,
  isTaskDone,
  leaveBalances,
  LEAVE_TYPES,
  money,
  openTasksFor,
  rangesOverlap,
  today,
  uid,
  workingDays,
  formatDate,
  formatMonth,
} from "./utils";

const DB_KEY = "workplace-ems-db";
const SESSION_KEY = "workplace-ems-session";

export type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

export interface NewHireInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  designation: string;
  departmentId: string;
  managerId: string | null;
  buddyId: string | null;
  role: Role;
  joiningDate: string;
  workMode: Employee["workMode"];
  location: string;
  gender: Employee["gender"];
  basicSalary: number;
  assets: Asset["type"][];
}

export interface TaskInput {
  boardId: string;
  columnId?: string;
  title: string;
  description?: string;
  priority: Priority;
  dueDate: string | null;
  assigneeIds: string[];
  recurrence?: Recurrence;
  tags?: string[];
}

/* ------------------------------------------------------------------ */
/* Pure helpers used inside mutations                                  */
/* ------------------------------------------------------------------ */

function pushNotification(
  db: DB,
  recipientIds: (string | null | undefined)[],
  title: string,
  message: string,
  category: NotificationCategory,
  link: string | null = null,
) {
  const unique = Array.from(new Set(recipientIds.filter((x): x is string => !!x)));
  for (const recipientId of unique) {
    db.notifications.unshift({
      id: uid("n"),
      recipientId,
      title,
      message,
      category,
      link,
      read: false,
      createdAt: new Date().toISOString(),
    });
  }
}

function pushActivity(
  db: DB,
  actorId: string | null,
  action: ActivityLog["action"],
  entity: string,
  message: string,
  category: NotificationCategory,
) {
  db.activity.unshift({ id: uid("a"), actorId, action, entity, message, category, at: new Date().toISOString() });
  if (db.activity.length > 300) db.activity.length = 300;
}

function adminIds(db: DB) {
  return db.employees.filter((e) => isAdminRole(e.role) && e.status !== "TERMINATED").map((e) => e.id);
}

function emp(db: DB, id: string | null | undefined) {
  return db.employees.find((e) => e.id === id);
}

/** Peers who could pick up work while someone is away (same dept, not on leave, lowest load first). */
export function suggestPeers(db: DB, employeeId: string, start = today(), end = today()) {
  const person = emp(db, employeeId);
  if (!person) return [];
  // Candidates: same department, or same team (shares the manager) — so people who are
  // the only member of their department still get cover suggestions.
  return db.employees
    .filter(
      (e) =>
        e.id !== employeeId &&
        (e.departmentId === person.departmentId || (!!person.managerId && e.managerId === person.managerId)) &&
        e.status !== "TERMINATED" &&
        e.status !== "OFFBOARDING" &&
        e.status !== "ONBOARDING" &&
        !db.leaves.some(
          (l) => l.employeeId === e.id && l.status === "APPROVED" && rangesOverlap(l.startDate, l.endDate, start, end),
        ),
    )
    .map((e) => ({ employee: e, load: openTasksFor(db, e.id).length, sameDept: e.departmentId === person.departmentId }))
    .sort((a, b) => Number(b.sameDept) - Number(a.sameDept) || a.load - b.load);
}

function ensurePersonalBoard(db: DB, ownerId: string): Board {
  let board = db.boards.find((b) => b.type === "PERSONAL" && b.ownerId === ownerId);
  if (!board) {
    const id = uid("b");
    const owner = emp(db, ownerId);
    board = {
      id,
      title: `${owner?.firstName ?? "My"}'s To-Dos`,
      type: "PERSONAL",
      projectId: null,
      ownerId,
      columns: defaultColumns(id),
      createdAt: new Date().toISOString(),
    };
    db.boards.push(board);
  }
  return board;
}

function syncStatuses(db: DB) {
  const t = today();
  for (const e of db.employees) {
    if (e.status === "ACTIVE" && isOnLeave(db, e.id, t)) e.status = "ON_LEAVE";
    else if (e.status === "ON_LEAVE" && !isOnLeave(db, e.id, t)) e.status = "ACTIVE";
  }
}

function loadDB(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed.version === DB_VERSION) return parsed;
    }
  } catch {
    /* ignore corrupt storage */
  }
  return createSeed();
}

/* ------------------------------------------------------------------ */
/* Store hook                                                          */
/* ------------------------------------------------------------------ */

function useStoreValue() {
  const [db, setDb] = useState<DB | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const dbRef = useRef<DB | null>(null);
  const sessionRef = useRef<string | null>(null);

  useEffect(() => {
    const loaded = loadDB();
    syncStatuses(loaded);
    dbRef.current = loaded;
    setDb(loaded);
    try {
      const s = localStorage.getItem(SESSION_KEY);
      sessionRef.current = s;
      setSessionId(s);
    } catch {
      /* ignore */
    }

    // Verify server session
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((res) => {
        if (res.ok && res.user) {
          sessionRef.current = res.user.id;
          setSessionId(res.user.id);
        }
      })
      .catch(() => {});

    if (isSupabaseConfigured) {
      loadFromSupabase(loaded).then((supaDb) => {
        if (supaDb) {
          syncStatuses(supaDb);
          dbRef.current = supaDb;
          setDb(supaDb);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (!db) return;
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch {
      /* storage full or unavailable */
    }
  }, [db]);

  /** Apply a mutation to a cloned DB synchronously and return the mutator's result. */
  const mutate = useCallback(<T,>(fn: (draft: DB, actor: Employee | undefined) => T): T => {
    const current = dbRef.current ?? createSeed();
    const draft: DB = structuredClone(current);
    const actor = draft.employees.find((e) => e.id === sessionRef.current);
    const out = fn(draft, actor);
    dbRef.current = draft;
    setDb(draft);
    return out;
  }, []);

  const setSession = useCallback((id: string | null) => {
    sessionRef.current = id;
    setSessionId(id);
    try {
      if (id) localStorage.setItem(SESSION_KEY, id);
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const user = useMemo(() => db?.employees.find((e) => e.id === sessionId) ?? null, [db, sessionId]);

  const actions = useMemo(() => {
    /* ------------------------------ Auth ------------------------------ */
    const login = async (email: string, password: string): Promise<Result<Employee>> => {
      // 1. Authenticate with backend API Route Handler & set session cookie
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (data.ok && data.user) {
          mutate((db) => {
            const exists = db.employees.some((x) => x.id === data.user.id);
            if (!exists) db.employees.push(data.user);
          });
          setSession(data.user.id);
          return { ok: true, data: data.user };
        } else if (!data.ok && data.error && !data.error.includes("Internal server error")) {
          return { ok: false, error: data.error };
        }
      } catch {
        // Fallback to local memory login if server is offline or unreachable
      }

      // 2. Local memory fallback
      const d = dbRef.current;
      if (!d) return { ok: false, error: "App is still loading." };
      const e = d.employees.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
      if (!e || e.password !== password) return { ok: false, error: "Invalid email or password." };
      if (e.accountStatus === "SUSPENDED" || e.status === "TERMINATED")
        return { ok: false, error: "This account has been suspended. Contact your HR administrator." };
      setSession(e.id);
      return { ok: true, data: e };
    };

    const logout = () => {
      fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      setSession(null);
    };

    const signup = (input: { name: string; email: string; password: string; orgName: string }): Result<Employee> => {
      const d = dbRef.current;
      if (!d) return { ok: false, error: "App is still loading." };
      if (d.employees.some((e) => e.email.toLowerCase() === input.email.trim().toLowerCase()))
        return { ok: false, error: "An account with this email already exists." };
      const [firstName, ...rest] = input.name.trim().split(/\s+/);
      const created = mutate((db) => {
        const e: Employee = {
          id: uid("e"),
          code: `WP-${1001 + db.employees.length}`,
          firstName: firstName || "New",
          lastName: rest.join(" ") || "Admin",
          email: input.email.trim().toLowerCase(),
          password: input.password,
          phone: "",
          role: "SUPER_ADMIN",
          accountStatus: "ACTIVE",
          designation: "Workspace Owner",
          departmentId: db.departments[0]?.id ?? "d_exec",
          managerId: null,
          buddyId: null,
          joiningDate: today(),
          status: "ACTIVE",
          location: "",
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
          salary: { basic: 100000, hra: 40000, allowances: 20000, otherDeductions: 0, effectiveDate: today() },
          bankAccount: "",
          pan: "",
        };
        db.employees.push(e);
        if (input.orgName.trim()) db.org.name = input.orgName.trim();
        pushActivity(db, e.id, "CREATE", "Organization", `${fullName(e)} created the ${db.org.name} workspace.`, "SYSTEM");
        return e;
      });
      setSession(created.id);
      return { ok: true, data: created };
    };

    const changePassword = (current: string, next: string): Result =>
      mutate((db, actor) => {
        if (!actor) return { ok: false, error: "Not signed in." };
        const me = emp(db, actor.id)!;
        if (me.password !== current) return { ok: false, error: "Current password is incorrect." };
        if (next.length < 6) return { ok: false, error: "New password must be at least 6 characters." };
        me.password = next;
        return { ok: true };
      });

    const resetDemo = () => {
      const fresh = createSeed();
      syncStatuses(fresh);
      dbRef.current = fresh;
      setDb(fresh);
    };

    /* ---------------------------- Employees --------------------------- */
    const addEmployee = (input: NewHireInput): Result<Employee> =>
      mutate((db, actor) => {
        if (db.employees.some((e) => e.email.toLowerCase() === input.email.trim().toLowerCase()))
          return { ok: false, error: "An employee with this email already exists." };
        const id = uid("e");
        const boardId = uid("b");
        const join = input.joiningDate || today();
        const e: Employee = {
          id,
          code: `WP-${1001 + db.employees.length}`,
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
          dob: "",
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
        db.employees.push(e);

        // Connected wedge #1: onboarding → auto-generated Kanban board.
        const columns = defaultColumns(boardId);
        db.boards.push({
          id: boardId,
          title: `Onboarding · ${fullName(e)}`,
          type: "ONBOARDING",
          projectId: null,
          ownerId: id,
          columns,
          createdAt: new Date().toISOString(),
        });
        const hr = actor?.id ?? adminIds(db)[0];
        const mgr = input.managerId ?? hr;
        const buddy = input.buddyId ?? mgr;
        const template: [string, string, string | null, Priority, number][] = [
          ["IT", "Provision laptop, email & tool accounts", hr, "HIGH", 0],
          ["HR", "Send offer letter & collect documents", hr, "HIGH", 0],
          ["HR", "Verify documents & activate payroll", hr, "HIGH", 3],
          ["Manager", "Prepare 30-60-90 day plan", mgr, "HIGH", 5],
          ["Manager", "Schedule team introduction meeting", mgr, "MEDIUM", 1],
          ["Buddy", "Welcome lunch & tools walkthrough", buddy, "MEDIUM", 2],
          ["Employee", "Upload ID & address proof", id, "HIGH", 1],
          ["Employee", "Complete compliance & security training", id, "MEDIUM", 7],
          ["Employee", "Set up workstation & development environment", id, "MEDIUM", 2],
        ];
        template.forEach(([tag, title, assignee, priority, offset], i) => {
          db.tasks.push({
            id: uid("t"),
            boardId,
            columnId: columns[0].id,
            title: `[${tag}] ${title}`,
            description: `Auto-generated onboarding step for ${fullName(e)}.`,
            priority,
            dueDate: addDays(join, offset),
            assigneeIds: assignee ? [assignee] : [],
            creatorId: hr ?? id,
            flag: "NORMAL",
            recurrence: "NONE",
            tags: [tag],
            comments: [],
            attachments: [],
            createdAt: new Date().toISOString(),
            completedAt: null,
            order: i,
          });
        });

        pushActivity(db, actor?.id ?? null, "CREATE", "Employee", `${fullName(actor)} added ${fullName(e)} (${e.designation}).`, "HR");
        pushActivity(db, null, "SYSTEM", "Board", `Onboarding board auto-generated for ${fullName(e)} (${template.length} tasks).`, "WORK");
        pushNotification(db, [mgr], "New joiner", `${fullName(e)} is joining your team on ${formatDate(join)}. Onboarding board created.`, "HR", "/employee/tasks");
        if (buddy && buddy !== mgr)
          pushNotification(db, [buddy], "You're an onboarding buddy", `You've been paired with ${fullName(e)} as their buddy.`, "HR", "/employee/tasks");
        pushNotification(db, [id], `Welcome to ${db.org.name}!`, "Your onboarding checklist is ready. Start with uploading your documents.", "HR", "/employee/tasks");
        fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }).catch(() => {});
        if (isSupabaseConfigured) {
          syncEmployeeToSupabase(e);
        }
        return { ok: true, data: e };
      });

    const updateEmployee = (id: string, patch: Partial<Employee>): Result =>
      mutate((db, actor) => {
        const e = emp(db, id);
        if (!e) return { ok: false, error: "Employee not found." };
        if (patch.email && db.employees.some((x) => x.id !== id && x.email.toLowerCase() === patch.email!.toLowerCase()))
          return { ok: false, error: "Email already in use." };
        if (patch.managerId && (patch.managerId === id || getSubordinates(db.employees, id).some((s) => s.id === patch.managerId)))
          return { ok: false, error: "That would create a circular reporting line." };
        const managerChanged = patch.managerId !== undefined && patch.managerId !== e.managerId;
        Object.assign(e, patch);
        pushActivity(db, actor?.id ?? null, "UPDATE", "Employee", `${fullName(actor)} updated ${fullName(e)}'s profile.`, "HR");
        if (managerChanged) {
          pushActivity(db, null, "SYSTEM", "OrgChart", `Reporting line changed for ${fullName(e)} — task permissions re-inherited from the org chart.`, "SYSTEM");
          pushNotification(db, [e.managerId], "New direct report", `${fullName(e)} now reports to you.`, "HR", "/employee/team");
        }
        fetch(`/api/employees/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }).catch(() => {});
        if (isSupabaseConfigured) {
          syncEmployeeToSupabase(e);
        }
        return { ok: true };
      });

    const completeOnboarding = (id: string): Result =>
      mutate((db, actor) => {
        const e = emp(db, id);
        if (!e) return { ok: false, error: "Employee not found." };
        e.status = "ACTIVE";
        if (e.onboarding) e.onboarding.offerLetterStatus = "ACCEPTED";
        pushActivity(db, actor?.id ?? null, "UPDATE", "Employee", `${fullName(e)} completed onboarding.`, "HR");
        pushNotification(db, [e.id, e.managerId], "Onboarding complete", `${fullName(e)} is now an active member of the team.`, "HR", null);
        return { ok: true };
      });

    const toggleOnboardingDoc = (id: string, itemId: string) =>
      mutate((db) => {
        const item = emp(db, id)?.onboarding?.documentsRequired.find((d) => d.id === itemId);
        if (item) item.done = !item.done;
      });

    const setOfferStatus = (id: string, status: "DRAFT" | "SENT" | "ACCEPTED") =>
      mutate((db) => {
        const e = emp(db, id);
        if (e?.onboarding) e.onboarding.offerLetterStatus = status;
      });

    const initiateOffboarding = (id: string, input: { lastWorkingDay: string; reason: string }): Result =>
      mutate((db, actor) => {
        const e = emp(db, id);
        if (!e) return { ok: false, error: "Employee not found." };
        e.status = "OFFBOARDING";
        e.offboarding = {
          lastWorkingDay: input.lastWorkingDay,
          reason: input.reason,
          initiatedAt: new Date().toISOString(),
          checklist: [
            "Resignation / termination letter acknowledged",
            "Knowledge transfer completed",
            "Laptop, ID & access cards returned",
            "System & tool access revoked",
            "Exit interview conducted",
            "Full & final settlement processed",
          ].map((label) => ({ id: uid("ob"), label, done: false })),
          settlementStatus: "PENDING",
          settlementAmount: 0,
        };
        // Hand off open work: flag their open tasks so managers can reassign.
        const open = openTasksFor(db, id);
        open.forEach((t) => {
          const task = db.tasks.find((x) => x.id === t.id)!;
          task.flag = "BLOCKED";
          task.comments.push({ id: uid("c"), authorId: actor?.id ?? id, text: `${fullName(e)} is leaving on ${formatDate(input.lastWorkingDay)} — please reassign.`, at: new Date().toISOString() });
        });
        pushActivity(db, actor?.id ?? null, "UPDATE", "Employee", `${fullName(actor)} initiated offboarding for ${fullName(e)}.`, "HR");
        pushNotification(db, [e.managerId], "Team member leaving", `${fullName(e)}'s last working day is ${formatDate(input.lastWorkingDay)}. ${open.length} open task(s) need reassignment.`, "HR", "/employee/team");
        return { ok: true };
      });

    const toggleOffboardingItem = (id: string, itemId: string) =>
      mutate((db) => {
        const item = emp(db, id)?.offboarding?.checklist.find((c) => c.id === itemId);
        if (item) item.done = !item.done;
      });

    const finalizeOffboarding = (id: string): Result<number> =>
      mutate((db, actor) => {
        const e = emp(db, id);
        if (!e || !e.offboarding) return { ok: false, error: "No offboarding in progress." };
        const annual = leaveBalances(db, id).find((b) => b.type === "ANNUAL");
        const encashment = Math.round(((annual?.available ?? 0) * e.salary.basic) / 22);
        const lwd = e.offboarding.lastWorkingDay;
        const monthStart = `${lwd.slice(0, 8)}01`;
        const daysWorked = workingDays(monthStart, lwd, db.holidays.map((h) => h.date));
        const proRata = Math.round(((e.salary.basic + e.salary.hra + e.salary.allowances) / 22) * daysWorked);
        e.offboarding.settlementAmount = proRata + encashment;
        e.offboarding.settlementStatus = "PROCESSED";
        e.offboarding.checklist.forEach((c) => (c.done = true));
        e.assets.forEach((a) => (a.returned = true));
        e.status = "TERMINATED";
        e.accountStatus = "SUSPENDED";
        pushActivity(db, actor?.id ?? null, "UPDATE", "Employee", `Offboarding finalised for ${fullName(e)} — settlement ${money(proRata + encashment)}.`, "HR");
        return { ok: true, data: proRata + encashment };
      });

    const setRole = (id: string, role: Role): Result =>
      mutate((db, actor) => {
        const e = emp(db, id);
        if (!e) return { ok: false, error: "Employee not found." };
        if (role === "SUPER_ADMIN" && actor?.role !== "SUPER_ADMIN")
          return { ok: false, error: "Only a Super Admin can grant Super Admin." };
        if (e.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN" && db.employees.filter((x) => x.role === "SUPER_ADMIN").length <= 1)
          return { ok: false, error: "At least one Super Admin is required." };
        e.role = role;
        pushActivity(db, actor?.id ?? null, "UPDATE", "User", `${fullName(actor)} changed ${fullName(e)}'s role to ${role}.`, "SYSTEM");
        pushNotification(db, [id], "Role updated", `Your access role is now ${role.replace("_", " ")}.`, "SYSTEM", null);
        return { ok: true };
      });

    const setAccountStatus = (id: string, status: AccountStatus): Result =>
      mutate((db, actor) => {
        const e = emp(db, id);
        if (!e) return { ok: false, error: "Employee not found." };
        if (id === actor?.id) return { ok: false, error: "You cannot suspend your own account." };
        e.accountStatus = status;
        pushActivity(db, actor?.id ?? null, "UPDATE", "User", `${fullName(actor)} ${status === "SUSPENDED" ? "suspended" : "re-activated"} ${fullName(e)}'s account.`, "SYSTEM");
        return { ok: true };
      });

    const resetPassword = (id: string) =>
      mutate((db, actor) => {
        const e = emp(db, id);
        if (!e) return;
        e.password = DEMO_PASSWORD;
        pushActivity(db, actor?.id ?? null, "UPDATE", "User", `${fullName(actor)} reset ${fullName(e)}'s password.`, "SYSTEM");
      });

    const togglePermission = (role: Role, module: ModuleKey) =>
      mutate((db, actor) => {
        if (role === "SUPER_ADMIN" && module === "access") return; // never lock out super admins
        db.permissions[role][module] = !db.permissions[role][module];
        pushActivity(db, actor?.id ?? null, "UPDATE", "Permission", `${fullName(actor)} ${db.permissions[role][module] ? "granted" : "revoked"} ${module} for ${role}.`, "SYSTEM");
      });

    const addDocument = (id: string, doc: Omit<EmployeeDocument, "id" | "uploadedAt" | "verified">) =>
      mutate((db, actor) => {
        const e = emp(db, id);
        if (!e) return;
        e.documents.push({ ...doc, id: uid("doc"), uploadedAt: today(), verified: false });
        pushActivity(db, actor?.id ?? null, "CREATE", "Document", `${fullName(actor)} uploaded “${doc.name}” for ${fullName(e)}.`, "HR");
      });

    const verifyDocument = (id: string, docId: string) =>
      mutate((db) => {
        const d = emp(db, id)?.documents.find((x) => x.id === docId);
        if (d) d.verified = !d.verified;
      });

    const removeDocument = (id: string, docId: string) =>
      mutate((db) => {
        const e = emp(db, id);
        if (e) e.documents = e.documents.filter((d) => d.id !== docId);
      });

    const assignAsset = (id: string, type: Asset["type"], tag: string) =>
      mutate((db) => {
        emp(db, id)?.assets.push({ id: uid("as"), type, tag, assignedAt: today(), returned: false });
      });

    const toggleAssetReturned = (id: string, assetId: string) =>
      mutate((db) => {
        const a = emp(db, id)?.assets.find((x) => x.id === assetId);
        if (a) a.returned = !a.returned;
      });

    const addDepartment = (name: string, code: string, color: string, headId: string | null): Result =>
      mutate((db, actor) => {
        if (db.departments.some((d) => d.code.toLowerCase() === code.toLowerCase()))
          return { ok: false, error: "Department code already exists." };
        db.departments.push({ id: uid("d"), name, code: code.toUpperCase(), color, headId });
        pushActivity(db, actor?.id ?? null, "CREATE", "Department", `${fullName(actor)} created the ${name} department.`, "HR");
        return { ok: true };
      });

    const updateOrg = (patch: Partial<OrgSettings>) =>
      mutate((db) => {
        Object.assign(db.org, patch);
      });

    /* --------------------------- Attendance --------------------------- */
    const clockIn = (remote = false): Result =>
      mutate((db, actor) => {
        if (!actor) return { ok: false, error: "Not signed in." };
        const t = today();
        let rec = db.attendance.find((a) => a.employeeId === actor.id && a.date === t);
        if (rec?.clockIn) return { ok: false, error: "Already clocked in today." };
        if (!rec) {
          rec = { id: uid("att"), employeeId: actor.id, date: t, clockIn: null, clockOut: null, status: "PRESENT" };
          db.attendance.push(rec);
        }
        rec.clockIn = new Date().toISOString();
        rec.status = remote ? "REMOTE" : "PRESENT";
        return { ok: true };
      });

    const clockOut = (): Result =>
      mutate((db, actor) => {
        if (!actor) return { ok: false, error: "Not signed in." };
        const rec = db.attendance.find((a) => a.employeeId === actor.id && a.date === today());
        if (!rec?.clockIn) return { ok: false, error: "You haven't clocked in yet." };
        if (rec.clockOut) return { ok: false, error: "Already clocked out." };
        rec.clockOut = new Date().toISOString();
        const hrs = (new Date(rec.clockOut).getTime() - new Date(rec.clockIn).getTime()) / 3600000;
        if (hrs < 4 && rec.status === "PRESENT") rec.status = "HALF_DAY";
        return { ok: true };
      });

    const setAttendance = (employeeId: string, date: string, status: AttendanceStatus) =>
      mutate((db, actor) => {
        let rec = db.attendance.find((a) => a.employeeId === employeeId && a.date === date);
        if (!rec) {
          rec = { id: uid("att"), employeeId, date, clockIn: null, clockOut: null, status } as Attendance;
          db.attendance.push(rec);
        }
        rec.status = status;
        if ((status === "PRESENT" || status === "REMOTE") && !rec.clockIn) {
          rec.clockIn = new Date(`${date}T09:00:00`).toISOString();
          rec.clockOut = new Date(`${date}T18:00:00`).toISOString();
        }
        pushActivity(db, actor?.id ?? null, "UPDATE", "Attendance", `${fullName(actor)} set ${fullName(emp(db, employeeId))}'s attendance on ${formatDate(date)} to ${status}.`, "HR");
      });

    const setShift = (employeeId: string, shift: string) =>
      mutate((db) => {
        const e = emp(db, employeeId);
        if (e) e.shift = shift;
      });

    const saveTimesheet = (weekStart: string, entries: Timesheet["entries"], submit: boolean): Result =>
      mutate((db, actor) => {
        if (!actor) return { ok: false, error: "Not signed in." };
        let ts = db.timesheets.find((x) => x.employeeId === actor.id && x.weekStart === weekStart);
        if (ts && (ts.status === "SUBMITTED" || ts.status === "APPROVED"))
          return { ok: false, error: "This timesheet is already submitted." };
        if (!ts) {
          ts = { id: uid("ts"), employeeId: actor.id, weekStart, entries, status: "DRAFT" };
          db.timesheets.push(ts);
        }
        ts.entries = entries;
        if (submit) {
          ts.status = "SUBMITTED";
          ts.submittedAt = new Date().toISOString();
          pushNotification(db, [actor.managerId], "Timesheet submitted", `${fullName(actor)} submitted a timesheet for week of ${formatDate(weekStart)}.`, "HR", "/employee/team");
        } else ts.status = "DRAFT";
        return { ok: true };
      });

    const decideTimesheet = (id: string, approve: boolean) =>
      mutate((db, actor) => {
        const ts = db.timesheets.find((x) => x.id === id);
        if (!ts) return;
        ts.status = approve ? "APPROVED" : "REJECTED";
        ts.decidedBy = actor?.id;
        pushNotification(db, [ts.employeeId], `Timesheet ${approve ? "approved" : "rejected"}`, `Your timesheet for week of ${formatDate(ts.weekStart)} was ${approve ? "approved" : "rejected"} by ${fullName(actor)}.`, "HR", "/employee/attendance");
      });

    /* ----------------------------- Leaves ----------------------------- */
    const requestLeave = (input: { type: LeaveTypeKey; startDate: string; endDate: string; reason: string }): Result =>
      mutate((db, actor) => {
        if (!actor) return { ok: false, error: "Not signed in." };
        if (!input.startDate || !input.endDate) return { ok: false, error: "Select start and end dates." };
        if (input.endDate < input.startDate) return { ok: false, error: "End date must be on or after start date." };
        if (!input.reason.trim()) return { ok: false, error: "Please add a reason." };
        const days = workingDays(input.startDate, input.endDate, db.holidays.map((h) => h.date));
        if (days === 0) return { ok: false, error: "Selected range has no working days." };
        const overlap = db.leaves.some(
          (l) => l.employeeId === actor.id && (l.status === "PENDING" || l.status === "APPROVED") && rangesOverlap(l.startDate, l.endDate, input.startDate, input.endDate),
        );
        if (overlap) return { ok: false, error: "You already have a leave request overlapping these dates." };
        const bal = leaveBalances(db, actor.id).find((b) => b.type === input.type)!;
        if (input.type !== "UNPAID" && days > bal.available)
          return { ok: false, error: `Insufficient balance: ${bal.available} day(s) of ${LEAVE_TYPES[input.type].label} available.` };
        const req: LeaveRequest = {
          id: uid("l"),
          employeeId: actor.id,
          type: input.type,
          startDate: input.startDate,
          endDate: input.endDate,
          days,
          reason: input.reason.trim(),
          status: "PENDING",
          approverId: null,
          createdAt: new Date().toISOString(),
        };
        db.leaves.unshift(req);
        const load = openTasksFor(db, actor.id).filter((t) => t.dueDate && t.dueDate >= input.startDate && t.dueDate <= input.endDate).length;
        pushNotification(db, [actor.managerId, ...adminIds(db)], "Leave request", `${fullName(actor)} requested ${days} day(s) of ${LEAVE_TYPES[input.type].label} (${formatDate(input.startDate, false)} – ${formatDate(input.endDate, false)}).${load ? ` ${load} task(s) due in that window.` : ""}`, "HR", "/admin/leaves");
        pushActivity(db, actor.id, "CREATE", "LeaveRequest", `${fullName(actor)} requested ${days} day(s) of ${LEAVE_TYPES[input.type].label}.`, "HR");
        fetch("/api/leaves", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }).catch(() => {});
        return { ok: true };
      });

    const cancelLeave = (id: string) =>
      mutate((db, actor) => {
        const l = db.leaves.find((x) => x.id === id);
        if (!l || l.employeeId !== actor?.id || l.status !== "PENDING") return;
        l.status = "CANCELLED";
        pushActivity(db, actor.id, "UPDATE", "LeaveRequest", `${fullName(actor)} cancelled a leave request.`, "HR");
        fetch(`/api/leaves/${id}/cancel`, { method: "POST" }).catch(() => {});
      });

    const decideLeave = (id: string, approve: boolean, comment = ""): Result<number> =>
      mutate((db, actor) => {
        const l = db.leaves.find((x) => x.id === id);
        if (!l) return { ok: false, error: "Request not found." };
        if (l.status !== "PENDING") return { ok: false, error: "Request already decided." };
        if (!actor) return { ok: false, error: "Not signed in." };
        if (l.employeeId === actor.id) return { ok: false, error: "You cannot approve your own leave." };
        if (!isAdminRole(actor.role) && !getSubordinates(db.employees, actor.id).some((s) => s.id === l.employeeId))
          return { ok: false, error: "You can only decide leave for your reporting line." };
        const person = emp(db, l.employeeId)!;
        l.status = approve ? "APPROVED" : "REJECTED";
        l.approverId = actor.id;
        l.decidedAt = new Date().toISOString();
        l.decisionComment = comment || undefined;
        pushActivity(db, actor.id, approve ? "APPROVE" : "REJECT", "LeaveRequest", `${fullName(actor)} ${approve ? "approved" : "rejected"} ${fullName(person)}'s ${LEAVE_TYPES[l.type].label}.`, "HR");
        pushNotification(db, [person.id], `Leave ${approve ? "approved" : "rejected"}`, `Your ${LEAVE_TYPES[l.type].label} (${formatDate(l.startDate, false)} – ${formatDate(l.endDate, false)}) was ${approve ? "approved" : "rejected"} by ${fullName(actor)}.${comment ? ` “${comment}”` : ""}`, "HR", "/employee/leaves");

        let flagged = 0;
        if (approve) {
          if (person.status === "ACTIVE" && l.startDate <= today() && l.endDate >= today()) person.status = "ON_LEAVE";
          // Connected wedge #2: leave → task delay signals + reassignment suggestions.
          const affected = db.tasks.filter(
            (t) =>
              t.assigneeIds.includes(person.id) &&
              !isTaskDone(db.boards, t) &&
              (!t.dueDate || (t.dueDate >= l.startDate && t.dueDate <= addDays(l.endDate, 3))),
          );
          const peers = suggestPeers(db, person.id, l.startDate, l.endDate);
          const suggestion = peers[0]?.employee;
          affected.forEach((t) => {
            t.flag = "DELAYED_ON_LEAVE";
            t.comments.push({
              id: uid("c"),
              authorId: actor.id,
              text: `⚠ Auto-flagged: ${fullName(person)} is on leave ${formatDate(l.startDate, false)} – ${formatDate(l.endDate, false)}.${suggestion ? ` Suggested reassignment: ${fullName(suggestion)}.` : ""}`,
              at: new Date().toISOString(),
            });
          });
          flagged = affected.length;
          if (flagged) {
            const creators = affected.map((t) => t.creatorId).filter((c) => c !== person.id);
            pushNotification(db, [...creators, person.managerId], "Tasks delayed — on leave", `${fullName(person)} will be on leave ${formatDate(l.startDate, false)} – ${formatDate(l.endDate, false)}. ${flagged} task(s) flagged.${suggestion ? ` Suggested: reassign to ${fullName(suggestion)}.` : ""}`, "WORK", "/employee/tasks");
            pushActivity(db, null, "SYSTEM", "Task", `${flagged} task(s) assigned to ${fullName(person)} flagged “Delayed — On Leave”.`, "WORK");
          }
        }
        fetch(`/api/leaves/${id}/decide`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approve, comment }),
        }).catch(() => {});
        if (isSupabaseConfigured) {
          syncLeaveDecisionToSupabase(id, approve ? "APPROVED" : "REJECTED", comment);
        }
        return { ok: true, data: flagged };
      });

    const addHoliday = (date: string, name: string, type: "National" | "Regional" | "Company") =>
      mutate((db) => {
        db.holidays.push({ id: uid("h"), date, name, type });
        db.holidays.sort((a, b) => a.date.localeCompare(b.date));
        pushNotification(db, db.employees.map((e) => e.id), "Holiday added", `${name} on ${formatDate(date)} has been added to the holiday calendar.`, "HR", "/employee/leaves");
      });

    const removeHoliday = (id: string) =>
      mutate((db) => {
        db.holidays = db.holidays.filter((h) => h.id !== id);
      });

    /* ------------------------------ Tasks ----------------------------- */
    const createTask = (input: TaskInput): Result<Task> =>
      mutate((db, actor) => {
        if (!actor) return { ok: false, error: "Not signed in." };
        if (!input.title.trim()) return { ok: false, error: "Title is required." };
        // Connected wedge #3: org chart → task permissions.
        const denied = input.assigneeIds.find((a) => !canManageTasksFor(db.employees, actor, a));
        if (denied) return { ok: false, error: `You can't assign work to ${fullName(emp(db, denied))} — they are outside your reporting line.` };
        let boardId = input.boardId;
        if (boardId === "personal") boardId = ensurePersonalBoard(db, actor.id).id;
        const board = db.boards.find((b) => b.id === boardId);
        if (!board) return { ok: false, error: "Board not found." };
        const task: Task = {
          id: uid("t"),
          boardId,
          columnId: input.columnId && board.columns.some((c) => c.id === input.columnId) ? input.columnId : board.columns[0].id,
          title: input.title.trim(),
          description: input.description ?? "",
          priority: input.priority,
          dueDate: input.dueDate,
          assigneeIds: input.assigneeIds,
          creatorId: actor.id,
          flag: "NORMAL",
          recurrence: input.recurrence ?? "NONE",
          tags: input.tags ?? [],
          comments: [],
          attachments: [],
          createdAt: new Date().toISOString(),
          completedAt: null,
          order: Date.now(),
        };
        // Attendance → workload context: flag immediately if assignee is on leave around the due date.
        const onLeave = task.assigneeIds.find((a) => db.leaves.some((l) => l.employeeId === a && l.status === "APPROVED" && task.dueDate && l.startDate <= task.dueDate && l.endDate >= today()));
        if (onLeave) task.flag = "DELAYED_ON_LEAVE";
        db.tasks.push(task);
        const others = task.assigneeIds.filter((a) => a !== actor.id);
        pushNotification(db, others, "Task assigned", `${fullName(actor)} assigned you to “${task.title}”${task.dueDate ? ` (due ${formatDate(task.dueDate, false)})` : ""}.`, "WORK", "/employee/tasks");
        if (board.type !== "PERSONAL")
          pushActivity(db, actor.id, "CREATE", "Task", `${fullName(actor)} created “${task.title}” on ${board.title}.`, "WORK");
        if (isSupabaseConfigured) {
          syncTaskToSupabase(task);
        }
        return { ok: true, data: task };
      });

    const updateTask = (id: string, patch: Partial<Task>): Result =>
      mutate((db, actor) => {
        const task = db.tasks.find((t) => t.id === id);
        if (!task || !actor) return { ok: false, error: "Task not found." };
        if (patch.assigneeIds) {
          const denied = patch.assigneeIds.find((a) => !task.assigneeIds.includes(a) && !canManageTasksFor(db.employees, actor, a));
          if (denied) return { ok: false, error: `You can't assign work to ${fullName(emp(db, denied))} — outside your reporting line.` };
          const added = patch.assigneeIds.filter((a) => !task.assigneeIds.includes(a) && a !== actor.id);
          pushNotification(db, added, "Task assigned", `${fullName(actor)} assigned you to “${task.title}”.`, "WORK", "/employee/tasks");
        }
        Object.assign(task, patch);
        if (isSupabaseConfigured) {
          syncTaskToSupabase(task);
        }
        return { ok: true };
      });

    const moveTask = (id: string, columnId: string, beforeId: string | null = null) =>
      mutate((db, actor) => {
        const task = db.tasks.find((t) => t.id === id);
        if (!task) return;
        const board = db.boards.find((b) => b.id === task.boardId);
        const column = board?.columns.find((c) => c.id === columnId);
        if (!board || !column) return;
        const wasDone = isTaskDone(db.boards, task);
        task.columnId = columnId;
        // Re-order within column.
        const siblings = db.tasks.filter((t) => t.boardId === task.boardId && t.columnId === columnId && t.id !== id).sort((a, b) => a.order - b.order);
        const idx = beforeId ? siblings.findIndex((s) => s.id === beforeId) : siblings.length;
        siblings.splice(idx < 0 ? siblings.length : idx, 0, task);
        siblings.forEach((s, i) => (s.order = i));
        const nowDone = column.category === "done";
        if (nowDone && !wasDone) {
          task.completedAt = new Date().toISOString();
          if (task.flag === "DELAYED_ON_LEAVE") task.flag = "NORMAL";
          if (board.type !== "PERSONAL")
            pushActivity(db, actor?.id ?? null, "UPDATE", "Task", `${fullName(actor)} completed “${task.title}”.`, "WORK");
          if (task.creatorId !== actor?.id)
            pushNotification(db, [task.creatorId], "Task completed", `${fullName(actor)} completed “${task.title}”.`, "WORK", null);
          // Recurring to-dos spawn their next occurrence.
          if (task.recurrence !== "NONE") {
            const step = task.recurrence === "DAILY" ? 1 : 7;
            db.tasks.push({
              ...structuredClone(task),
              id: uid("t"),
              columnId: board.columns[0].id,
              dueDate: addDays(task.dueDate ?? today(), step),
              completedAt: null,
              comments: [],
              createdAt: new Date().toISOString(),
              order: Date.now(),
            });
          }
        } else if (!nowDone && wasDone) {
          task.completedAt = null;
        }
      });

    const deleteTask = (id: string) =>
      mutate((db) => {
        db.tasks = db.tasks.filter((t) => t.id !== id);
      });

    const addComment = (taskId: string, text: string) =>
      mutate((db, actor) => {
        const task = db.tasks.find((t) => t.id === taskId);
        if (!task || !actor || !text.trim()) return;
        task.comments.push({ id: uid("c"), authorId: actor.id, text: text.trim(), at: new Date().toISOString() });
        const mentions = [...task.assigneeIds, task.creatorId].filter((x) => x !== actor.id);
        pushNotification(db, mentions, "New comment", `${fullName(actor)} commented on “${task.title}”.`, "WORK", "/employee/tasks");
      });

    const addAttachment = (taskId: string, name: string, size: number) =>
      mutate((db, actor) => {
        const task = db.tasks.find((t) => t.id === taskId);
        if (!task || !actor) return;
        task.attachments.push({ id: uid("f"), name, size, uploadedBy: actor.id, at: new Date().toISOString() });
      });

    const removeAttachment = (taskId: string, attId: string) =>
      mutate((db) => {
        const task = db.tasks.find((t) => t.id === taskId);
        if (task) task.attachments = task.attachments.filter((a) => a.id !== attId);
      });

    const reassignTask = (taskId: string, fromId: string, toId: string): Result =>
      mutate((db, actor) => {
        const task = db.tasks.find((t) => t.id === taskId);
        if (!task || !actor) return { ok: false, error: "Task not found." };
        // Allowed when the actor manages the target, or manages the current assignee and
        // hands the work to a same-department peer (the suggested-cover flow).
        const from = emp(db, fromId);
        const to = emp(db, toId);
        const coverPeer = !!from && !!to && (from.departmentId === to.departmentId || (!!from.managerId && from.managerId === to.managerId)) && canManageTasksFor(db.employees, actor, fromId);
        if (!canManageTasksFor(db.employees, actor, toId) && !coverPeer)
          return { ok: false, error: `${fullName(to)} is outside your reporting line.` };
        task.assigneeIds = Array.from(new Set(task.assigneeIds.filter((a) => a !== fromId).concat(toId)));
        task.flag = "NORMAL";
        task.comments.push({ id: uid("c"), authorId: actor.id, text: `Reassigned from ${fullName(emp(db, fromId))} to ${fullName(emp(db, toId))}.`, at: new Date().toISOString() });
        pushNotification(db, [toId], "Task reassigned to you", `${fullName(actor)} reassigned “${task.title}” to you.`, "WORK", "/employee/tasks");
        pushActivity(db, actor.id, "UPDATE", "Task", `${fullName(actor)} reassigned “${task.title}” to ${fullName(emp(db, toId))}.`, "WORK");
        return { ok: true };
      });

    const createProject = (input: Omit<Project, "id">): Result<Project> =>
      mutate((db, actor) => {
        if (!input.name.trim()) return { ok: false, error: "Project name is required." };
        const p: Project = { ...input, id: uid("p") };
        db.projects.push(p);
        const boardId = uid("b");
        db.boards.push({ id: boardId, title: p.name, type: "PROJECT", projectId: p.id, ownerId: null, columns: defaultColumns(boardId), createdAt: new Date().toISOString() });
        pushActivity(db, actor?.id ?? null, "CREATE", "Project", `${fullName(actor)} created project “${p.name}”.`, "WORK");
        pushNotification(db, [p.leadId], "Project lead", `You are the lead for the new project “${p.name}”.`, "WORK", "/admin/projects");
        return { ok: true, data: p };
      });

    const updateProject = (id: string, patch: Partial<Project>) =>
      mutate((db) => {
        const p = db.projects.find((x) => x.id === id);
        if (!p) return;
        Object.assign(p, patch);
        const b = db.boards.find((x) => x.projectId === id);
        if (b && patch.name) b.title = patch.name;
      });

    const addColumn = (boardId: string, name: string, category: ColumnCategory) =>
      mutate((db) => {
        const b = db.boards.find((x) => x.id === boardId);
        if (!b || !name.trim()) return;
        const col = { id: uid("col"), name: name.trim(), category };
        // Insert before the first "done" column so Done stays last.
        const doneIdx = b.columns.findIndex((c) => c.category === "done");
        if (category !== "done" && doneIdx >= 0) b.columns.splice(doneIdx, 0, col);
        else b.columns.push(col);
      });

    const renameColumn = (boardId: string, columnId: string, name: string) =>
      mutate((db) => {
        const c = db.boards.find((x) => x.id === boardId)?.columns.find((x) => x.id === columnId);
        if (c && name.trim()) c.name = name.trim();
      });

    const removeColumn = (boardId: string, columnId: string): Result =>
      mutate((db) => {
        const b = db.boards.find((x) => x.id === boardId);
        if (!b) return { ok: false, error: "Board not found." };
        if (b.columns.length <= 2) return { ok: false, error: "A board needs at least two stages." };
        const target = b.columns.find((c) => c.id !== columnId)!;
        db.tasks.forEach((t) => {
          if (t.boardId === boardId && t.columnId === columnId) t.columnId = target.id;
        });
        b.columns = b.columns.filter((c) => c.id !== columnId);
        return { ok: true };
      });

    /* ---------------------------- Expenses ---------------------------- */
    const submitExpense = (input: Omit<Expense, "id" | "employeeId" | "status" | "createdAt">): Result =>
      mutate((db, actor) => {
        if (!actor) return { ok: false, error: "Not signed in." };
        if (!(input.amount > 0)) return { ok: false, error: "Enter a valid amount." };
        if (!input.description.trim()) return { ok: false, error: "Add a short description." };
        db.expenses.unshift({ ...input, id: uid("x"), employeeId: actor.id, status: "PENDING", createdAt: new Date().toISOString() });
        pushNotification(db, adminIds(db), "Expense claim", `${fullName(actor)} submitted a ${input.category.toLowerCase()} claim of ${money(input.amount)}.`, "HR", "/admin/expenses");
        pushActivity(db, actor.id, "CREATE", "Expense", `${fullName(actor)} submitted an expense claim of ${money(input.amount)}.`, "HR");
        return { ok: true };
      });

    const decideExpense = (id: string, approve: boolean) =>
      mutate((db, actor) => {
        const x = db.expenses.find((e) => e.id === id);
        if (!x || x.status !== "PENDING") return;
        x.status = approve ? "APPROVED" : "REJECTED";
        x.decidedBy = actor?.id;
        pushNotification(db, [x.employeeId], `Expense ${approve ? "approved" : "rejected"}`, `Your ${x.category.toLowerCase()} claim of ${money(x.amount)} was ${approve ? "approved — it will be paid with the next payroll" : "rejected"}.`, "HR", "/employee/expenses");
        pushActivity(db, actor?.id ?? null, approve ? "APPROVE" : "REJECT", "Expense", `${fullName(actor)} ${approve ? "approved" : "rejected"} ${fullName(emp(db, x.employeeId))}'s claim of ${money(x.amount)}.`, "HR");
      });

    /* ----------------------------- Payroll ---------------------------- */
    const generatePayroll = (month: string): Result<PayrollRun> =>
      mutate((db, actor) => {
        if (db.payrollRuns.some((r) => r.month === month)) return { ok: false, error: `A payroll run for ${formatMonth(month)} already exists.` };
        const monthStart = `${month}-01`;
        const [y, m] = month.split("-").map(Number);
        const monthEnd = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
        const holidayDates = db.holidays.map((h) => h.date);
        const wd = workingDays(monthStart, monthEnd, holidayDates);
        // Skip claims already bundled into another (unpaid) run so nothing is reimbursed twice.
        const bundled = new Set(db.payrollRuns.flatMap((r) => r.expenseIds));
        const approvedExpenses = db.expenses.filter((x) => x.status === "APPROVED" && !bundled.has(x.id));
        const eligible = db.employees.filter((e) => e.status !== "TERMINATED" && e.joiningDate <= monthEnd);
        const lines = eligible.map((e) => {
          const absent = db.attendance.filter((a) => a.employeeId === e.id && a.date >= monthStart && a.date <= monthEnd && a.status === "ABSENT").length;
          const halfDays = db.attendance.filter((a) => a.employeeId === e.id && a.date >= monthStart && a.date <= monthEnd && a.status === "HALF_DAY").length;
          const unpaid = db.leaves
            .filter((l) => l.employeeId === e.id && l.type === "UNPAID" && l.status === "APPROVED" && rangesOverlap(l.startDate, l.endDate, monthStart, monthEnd))
            .reduce((s, l) => s + workingDays(l.startDate < monthStart ? monthStart : l.startDate, l.endDate > monthEnd ? monthEnd : l.endDate, holidayDates), 0);
          const reimb = approvedExpenses.filter((x) => x.employeeId === e.id).reduce((s, x) => s + x.amount, 0);
          return computePayrollLine(e, { reimbursements: reimb, lopDays: absent + halfDays * 0.5 + unpaid, workingDaysInMonth: wd || 22 });
        });
        const run: PayrollRun = {
          id: uid("pr"),
          month,
          status: "DRAFT",
          createdAt: new Date().toISOString(),
          lines,
          expenseIds: approvedExpenses.filter((x) => eligible.some((e) => e.id === x.employeeId)).map((x) => x.id),
        };
        db.payrollRuns.push(run);
        db.payrollRuns.sort((a, b) => b.month.localeCompare(a.month));
        pushActivity(db, actor?.id ?? null, "CREATE", "PayrollRun", `${fullName(actor)} generated a draft payroll for ${formatMonth(month)} (${lines.length} employees).`, "SYSTEM");
        return { ok: true, data: run };
      });

    const recalcPayroll = (id: string) =>
      mutate((db) => {
        const run = db.payrollRuns.find((r) => r.id === id);
        if (!run || run.status !== "DRAFT") return;
        run.lines = run.lines.map((l) => {
          const e = emp(db, l.employeeId);
          return e ? computePayrollLine(e, { reimbursements: l.reimbursements, lopDays: l.lopDays }) : l;
        });
      });

    const setPayrollStatus = (id: string, status: "PROCESSED" | "PAID") =>
      mutate((db, actor) => {
        const run = db.payrollRuns.find((r) => r.id === id);
        if (!run) return;
        run.status = status;
        if (status === "PROCESSED") run.processedAt = new Date().toISOString();
        if (status === "PAID") {
          run.paidAt = new Date().toISOString();
          db.expenses.forEach((x) => {
            if (run.expenseIds.includes(x.id) && x.status === "APPROVED") x.status = "REIMBURSED";
          });
          pushNotification(db, run.lines.map((l) => l.employeeId), "Payslip available", `Your payslip for ${formatMonth(run.month)} is ready.`, "HR", "/employee/payslips");
        }
        pushActivity(db, actor?.id ?? null, "UPDATE", "PayrollRun", `${fullName(actor)} marked payroll for ${formatMonth(run.month)} as ${status.toLowerCase()}.`, "SYSTEM");
      });

    const deletePayrollRun = (id: string) =>
      mutate((db) => {
        db.payrollRuns = db.payrollRuns.filter((r) => r.id !== id || r.status !== "DRAFT");
      });

    const updateSalary = (employeeId: string, salary: SalaryStructure) =>
      mutate((db, actor) => {
        const e = emp(db, employeeId);
        if (!e) return;
        e.salary = salary;
        pushActivity(db, actor?.id ?? null, "UPDATE", "SalaryStructure", `${fullName(actor)} updated the salary structure for ${fullName(e)}.`, "HR");
      });

    /* --------------------------- Performance -------------------------- */
    const saveGoal = (goal: Omit<Goal, "id"> & { id?: string }) =>
      mutate((db) => {
        if (goal.id) {
          const g = db.goals.find((x) => x.id === goal.id);
          if (g) Object.assign(g, goal);
        } else db.goals.push({ ...goal, id: uid("g") });
      });

    const deleteGoal = (id: string) =>
      mutate((db) => {
        db.goals = db.goals.filter((g) => g.id !== id);
      });

    const createCycle = (name: string, startDate: string, endDate: string): Result =>
      mutate((db, actor) => {
        if (!name.trim() || !startDate || !endDate) return { ok: false, error: "Fill all fields." };
        if (endDate < startDate) return { ok: false, error: "End date must be after start date." };
        const id = uid("rc");
        db.cycles.push({ id, name: name.trim(), startDate, endDate, status: "ACTIVE" });
        const eligible = db.employees.filter((e) => e.status !== "TERMINATED" && e.status !== "ONBOARDING");
        eligible.forEach((e) =>
          db.reviews.push({
            id: uid("rv"), cycleId: id, employeeId: e.id, reviewerId: e.managerId,
            selfRating: null, selfComment: "", peerFeedback: [], managerRating: null, managerComment: "", status: "PENDING_SELF",
          }),
        );
        pushNotification(db, eligible.map((e) => e.id), "Review cycle started", `${name} is open — submit your self-assessment.`, "HR", "/employee/performance");
        pushActivity(db, actor?.id ?? null, "CREATE", "ReviewCycle", `${fullName(actor)} launched “${name}” for ${eligible.length} employees.`, "HR");
        return { ok: true };
      });

    const closeCycle = (id: string) =>
      mutate((db, actor) => {
        const c = db.cycles.find((x) => x.id === id);
        if (!c) return;
        c.status = "CLOSED";
        pushActivity(db, actor?.id ?? null, "UPDATE", "ReviewCycle", `${fullName(actor)} closed “${c.name}”.`, "HR");
      });

    const submitSelfReview = (reviewId: string, rating: number, comment: string) =>
      mutate((db, actor) => {
        const r = db.reviews.find((x) => x.id === reviewId);
        if (!r) return;
        r.selfRating = rating;
        r.selfComment = comment;
        if (r.status === "PENDING_SELF") r.status = "PENDING_MANAGER";
        pushNotification(db, [r.reviewerId], "Self-review submitted", `${fullName(actor)} submitted their self-assessment. Your review is due.`, "HR", "/employee/team");
      });

    const submitManagerReview = (reviewId: string, rating: number, comment: string) =>
      mutate((db, actor) => {
        const r = db.reviews.find((x) => x.id === reviewId);
        if (!r) return;
        r.managerRating = rating;
        r.managerComment = comment;
        r.reviewerId = r.reviewerId ?? actor?.id ?? null;
        r.status = "COMPLETED";
        pushNotification(db, [r.employeeId], "Review completed", `${fullName(actor)} completed your performance review.`, "HR", "/employee/performance");
        pushActivity(db, actor?.id ?? null, "UPDATE", "Review", `${fullName(actor)} completed ${fullName(emp(db, r.employeeId))}'s review.`, "HR");
      });

    const addPeerFeedback = (reviewId: string, rating: number, comment: string) =>
      mutate((db, actor) => {
        const r = db.reviews.find((x) => x.id === reviewId);
        if (!r || !actor) return;
        r.peerFeedback = r.peerFeedback.filter((p) => p.fromId !== actor.id);
        r.peerFeedback.push({ fromId: actor.id, rating, comment });
        pushNotification(db, [r.employeeId], "Peer feedback received", `You received new peer feedback.`, "HR", "/employee/performance");
      });

    /* -------------------------- Notifications ------------------------- */
    const markRead = (id: string) =>
      mutate((db) => {
        const n = db.notifications.find((x) => x.id === id);
        if (n) n.read = true;
      });

    const markAllRead = () =>
      mutate((db, actor) => {
        db.notifications.forEach((n) => {
          if (n.recipientId === actor?.id) n.read = true;
        });
      });

    const clearNotifications = () =>
      mutate((db, actor) => {
        db.notifications = db.notifications.filter((n: Notification) => n.recipientId !== actor?.id);
      });

    return {
      login, logout, signup, changePassword, resetDemo,
      addEmployee, updateEmployee, completeOnboarding, toggleOnboardingDoc, setOfferStatus,
      initiateOffboarding, toggleOffboardingItem, finalizeOffboarding,
      setRole, setAccountStatus, resetPassword, togglePermission,
      addDocument, verifyDocument, removeDocument, assignAsset, toggleAssetReturned, addDepartment, updateOrg,
      clockIn, clockOut, setAttendance, setShift, saveTimesheet, decideTimesheet,
      requestLeave, cancelLeave, decideLeave, addHoliday, removeHoliday,
      createTask, updateTask, moveTask, deleteTask, addComment, addAttachment, removeAttachment, reassignTask,
      createProject, updateProject, addColumn, renameColumn, removeColumn,
      submitExpense, decideExpense,
      generatePayroll, recalcPayroll, setPayrollStatus, deletePayrollRun, updateSalary,
      saveGoal, deleteGoal, createCycle, closeCycle, submitSelfReview, submitManagerReview, addPeerFeedback,
      markRead, markAllRead, clearNotifications,
    };
  }, [mutate, setSession]);

  return { db, user, ready: db !== null, isSupabaseConfigured, ...actions };
}

export type Store = ReturnType<typeof useStoreValue>;
const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const value = useStoreValue();
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

/** Convenience hook for pages rendered inside an authenticated layout. */
export function useAuthed() {
  const store = useStore();
  return { ...store, db: store.db as DB, user: store.user as Employee };
}
