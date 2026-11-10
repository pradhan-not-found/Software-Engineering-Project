import type {
  Board,
  ColumnCategory,
  DB,
  Employee,
  LeaveTypeKey,
  ModuleKey,
  PayrollLine,
  Role,
  Task,
} from "./types";

/* ------------------------------------------------------------------ */
/* Generic helpers                                                     */
/* ------------------------------------------------------------------ */

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

export function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function today() {
  return toISODate(new Date());
}

export function parseDate(s: string) {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, n: number) {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function daysBetween(a: string, b: string) {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000);
}

export function isWeekend(s: string) {
  const day = parseDate(s).getDay();
  return day === 0 || day === 6;
}

/** Working days between two dates inclusive, excluding weekends and holidays. */
export function workingDays(start: string, end: string, holidays: string[] = []) {
  if (daysBetween(start, end) < 0) return 0;
  let count = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    if (!isWeekend(d) && !holidays.includes(d)) count++;
  }
  return count;
}

export function startOfWeek(s: string) {
  const d = parseDate(s);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return toISODate(d);
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart <= bEnd && bStart <= aEnd;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatDate(s: string | null | undefined, withYear = true) {
  if (!s) return "—";
  const d = parseDate(s);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}${withYear ? `, ${d.getFullYear()}` : ""}`;
}

export function formatMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

export function formatTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 2) return "yesterday";
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(iso.slice(0, 10));
}

export function hoursBetween(a: string | null, b: string | null) {
  if (!a || !b) return 0;
  return Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 3600000);
}

export function currentQuarter(date = new Date()) {
  return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/* ------------------------------------------------------------------ */
/* Money                                                               */
/* ------------------------------------------------------------------ */

export function money(n: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    Math.round(n),
  );
}

/* ------------------------------------------------------------------ */
/* People                                                              */
/* ------------------------------------------------------------------ */

export function fullName(e: Pick<Employee, "firstName" | "lastName"> | undefined | null) {
  return e ? `${e.firstName} ${e.lastName}` : "Unknown";
}

export function initials(e: Pick<Employee, "firstName" | "lastName"> | undefined | null) {
  if (!e) return "?";
  return `${e.firstName[0] ?? ""}${e.lastName[0] ?? ""}`.toUpperCase();
}

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  HR_ADMIN: "HR Admin",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
};

export function isAdminRole(role: Role) {
  return role === "SUPER_ADMIN" || role === "HR_ADMIN";
}

/** Map a notification link to a page the given role can actually open. */
export function resolveLink(link: string | null, role: Role): string | null {
  if (!link) return null;
  if (!link.startsWith("/admin") || isAdminRole(role)) return link;
  if (link.startsWith("/admin/leaves") || link.startsWith("/admin/attendance")) return "/employee/team";
  if (link.startsWith("/admin/projects")) return "/employee/tasks";
  if (link.startsWith("/admin/expenses")) return "/employee/expenses";
  if (link.startsWith("/admin/payroll")) return "/employee/payslips";
  if (link.startsWith("/admin/performance")) return "/employee/performance";
  return "/employee/notifications";
}

/** All employees reporting (directly or indirectly) to managerId. */
export function getSubordinates(employees: Employee[], managerId: string): Employee[] {
  const result: Employee[] = [];
  const queue = [managerId];
  const seen = new Set<string>();
  while (queue.length) {
    const id = queue.shift()!;
    for (const e of employees) {
      if (e.managerId === id && !seen.has(e.id)) {
        seen.add(e.id);
        result.push(e);
        queue.push(e.id);
      }
    }
  }
  return result;
}

export function getDirectReports(employees: Employee[], managerId: string) {
  return employees.filter((e) => e.managerId === managerId && e.status !== "TERMINATED");
}

/** Reporting chain from the employee up to the top of the org. */
export function getManagerChain(employees: Employee[], id: string): Employee[] {
  const chain: Employee[] = [];
  let current = employees.find((e) => e.id === id);
  const seen = new Set<string>();
  while (current?.managerId && !seen.has(current.managerId)) {
    seen.add(current.managerId);
    const mgr = employees.find((e) => e.id === current!.managerId);
    if (!mgr) break;
    chain.push(mgr);
    current = mgr;
  }
  return chain;
}

/**
 * Connected wedge: Org chart → task permissions.
 * An actor may assign/view tasks for themselves, anyone in their reporting
 * subtree, and admins may assign to anyone.
 */
export function canManageTasksFor(employees: Employee[], actor: Employee, targetId: string) {
  if (actor.id === targetId) return true;
  if (isAdminRole(actor.role)) return true;
  return getSubordinates(employees, actor.id).some((e) => e.id === targetId);
}

export function assignableEmployees(employees: Employee[], actor: Employee) {
  const active = employees.filter((e) => e.status !== "TERMINATED");
  if (isAdminRole(actor.role)) return active;
  const subs = new Set(getSubordinates(employees, actor.id).map((e) => e.id));
  return active.filter((e) => e.id === actor.id || subs.has(e.id));
}

/* ------------------------------------------------------------------ */
/* Leaves                                                              */
/* ------------------------------------------------------------------ */

export const LEAVE_TYPES: Record<LeaveTypeKey, { label: string; allocation: number; color: string }> = {
  ANNUAL: { label: "Annual Leave", allocation: 18, color: "blue" },
  SICK: { label: "Sick Leave", allocation: 10, color: "red" },
  CASUAL: { label: "Casual Leave", allocation: 8, color: "amber" },
  PARENTAL: { label: "Parental Leave", allocation: 26, color: "purple" },
  UNPAID: { label: "Unpaid Leave", allocation: 30, color: "gray" },
};

export function leaveBalances(db: DB, employeeId: string, year = new Date().getFullYear()) {
  const mine = db.leaves.filter(
    (l) => l.employeeId === employeeId && l.startDate.startsWith(String(year)),
  );
  return (Object.keys(LEAVE_TYPES) as LeaveTypeKey[]).map((type) => {
    const used = mine.filter((l) => l.type === type && l.status === "APPROVED").reduce((s, l) => s + l.days, 0);
    const pending = mine.filter((l) => l.type === type && l.status === "PENDING").reduce((s, l) => s + l.days, 0);
    const allocated = LEAVE_TYPES[type].allocation;
    return { type, ...LEAVE_TYPES[type], allocated, used, pending, available: Math.max(0, allocated - used - pending) };
  });
}

export function isOnLeave(db: DB, employeeId: string, date = today()) {
  return db.leaves.some(
    (l) => l.employeeId === employeeId && l.status === "APPROVED" && l.startDate <= date && l.endDate >= date,
  );
}

/* ------------------------------------------------------------------ */
/* Tasks                                                               */
/* ------------------------------------------------------------------ */

export function columnCategory(boards: Board[], task: Task): ColumnCategory {
  const board = boards.find((b) => b.id === task.boardId);
  return board?.columns.find((c) => c.id === task.columnId)?.category ?? "todo";
}

export function isTaskDone(boards: Board[], task: Task) {
  return columnCategory(boards, task) === "done";
}

export function isOverdue(boards: Board[], task: Task) {
  return !!task.dueDate && task.dueDate < today() && !isTaskDone(boards, task);
}

export function openTasksFor(db: DB, employeeId: string) {
  return db.tasks.filter((t) => t.assigneeIds.includes(employeeId) && !isTaskDone(db.boards, t));
}

export const PRIORITY_ORDER = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;

/**
 * Connected wedge: Performance reviews → real task data.
 * Metrics computed from the work-management module for a date window.
 */
export function performanceMetrics(db: DB, employeeId: string, start: string, end: string) {
  const assigned = db.tasks.filter((t) => t.assigneeIds.includes(employeeId));
  const completed = assigned.filter(
    (t) => t.completedAt && t.completedAt.slice(0, 10) >= start && t.completedAt.slice(0, 10) <= end,
  );
  const withDue = completed.filter((t) => t.dueDate);
  const onTime = withDue.filter((t) => t.completedAt!.slice(0, 10) <= t.dueDate!);
  const overdueOpen = assigned.filter((t) => isOverdue(db.boards, t));
  const projectIds = new Set(
    assigned
      .map((t) => db.boards.find((b) => b.id === t.boardId)?.projectId)
      .filter((x): x is string => !!x),
  );
  const att = db.attendance.filter((a) => a.employeeId === employeeId && a.date >= start && a.date <= end);
  const present = att.filter((a) => a.status === "PRESENT" || a.status === "REMOTE").length +
    att.filter((a) => a.status === "HALF_DAY").length * 0.5;
  const workDaysRecorded = att.filter((a) => a.status !== "ON_LEAVE").length;
  const leaveDays = db.leaves
    .filter((l) => l.employeeId === employeeId && l.status === "APPROVED" && rangesOverlap(l.startDate, l.endDate, start, end))
    .reduce((s, l) => s + l.days, 0);
  return {
    assigned: assigned.length,
    completed: completed.length,
    onTimeRate: withDue.length ? Math.round((onTime.length / withDue.length) * 100) : 100,
    missedDeadlines: withDue.length - onTime.length + overdueOpen.length,
    overdueOpen: overdueOpen.length,
    projects: projectIds.size,
    attendanceRate: workDaysRecorded ? Math.round((present / workDaysRecorded) * 100) : 100,
    leaveDays,
  };
}

/* ------------------------------------------------------------------ */
/* Payroll                                                             */
/* ------------------------------------------------------------------ */

/** Simplified annual income-tax computation (new-regime style slabs). */
export function annualIncomeTax(annualTaxable: number) {
  const slabs: [number, number][] = [
    [300000, 0],
    [700000, 0.05],
    [1000000, 0.1],
    [1200000, 0.15],
    [1500000, 0.2],
    [Infinity, 0.3],
  ];
  let tax = 0;
  let prev = 0;
  for (const [limit, rate] of slabs) {
    if (annualTaxable > prev) {
      tax += (Math.min(annualTaxable, limit) - prev) * rate;
    }
    prev = limit;
  }
  if (annualTaxable <= 700000) tax = 0; // rebate
  return Math.round(tax * 1.04); // 4% cess
}

export function computePayrollLine(
  emp: Employee,
  opts: { reimbursements?: number; lopDays?: number; workingDaysInMonth?: number } = {},
): PayrollLine {
  const { basic, hra, allowances, otherDeductions } = emp.salary;
  const reimbursements = opts.reimbursements ?? 0;
  const lopDays = opts.lopDays ?? 0;
  const wd = opts.workingDaysInMonth ?? 22;
  const fixedGross = basic + hra + allowances;
  const lopDeduction = Math.round((fixedGross / wd) * lopDays);
  const gross = fixedGross + reimbursements;
  const pf = Math.round(Math.min(basic, 15000) * 0.12);
  const professionalTax = fixedGross > 15000 ? 200 : 0;
  const annualTaxable = Math.max(0, (fixedGross - lopDeduction) * 12 - 75000);
  const incomeTax = Math.round(annualIncomeTax(annualTaxable) / 12);
  const totalDeductions = pf + professionalTax + incomeTax + lopDeduction + otherDeductions;
  return {
    employeeId: emp.id,
    basic,
    hra,
    allowances,
    reimbursements,
    gross,
    pf,
    professionalTax,
    incomeTax,
    lopDeduction,
    otherDeductions,
    totalDeductions,
    net: gross - totalDeductions,
    lopDays,
  };
}

/* ------------------------------------------------------------------ */
/* Access control                                                      */
/* ------------------------------------------------------------------ */

export const MODULES: { key: ModuleKey; label: string; description: string }[] = [
  { key: "directory", label: "Employee Directory", description: "View and manage employee records" },
  { key: "orgchart", label: "Org Chart", description: "Reporting hierarchy visualisation" },
  { key: "onboarding", label: "On/Offboarding", description: "New hire & exit workflows" },
  { key: "projects", label: "Projects & Boards", description: "Project Kanban boards" },
  { key: "leaves", label: "Leave Approvals", description: "Approve and audit leave requests" },
  { key: "attendance", label: "Attendance & Timesheets", description: "Attendance logs, shifts and timesheets" },
  { key: "payroll", label: "Payroll", description: "Salary structures, payroll runs and payslips" },
  { key: "expenses", label: "Expense Claims", description: "Reimbursement approvals" },
  { key: "performance", label: "Performance", description: "Goals and review cycles" },
  { key: "access", label: "Access Control", description: "Roles, permissions and account status" },
];

export function hasModule(db: DB, role: Role, mod: ModuleKey) {
  return db.permissions[role]?.[mod] ?? false;
}

/* ------------------------------------------------------------------ */
/* Colors                                                              */
/* ------------------------------------------------------------------ */

// Full class strings so Tailwind's JIT picks them up.
export const COLOR_CLASSES: Record<string, { bg: string; text: string; soft: string; dot: string; border: string }> = {
  blue: { bg: "bg-blue-500", text: "text-blue-600 dark:text-blue-400", soft: "bg-blue-100 dark:bg-blue-500/15", dot: "bg-blue-500", border: "border-blue-500" },
  purple: { bg: "bg-purple-500", text: "text-purple-600 dark:text-purple-400", soft: "bg-purple-100 dark:bg-purple-500/15", dot: "bg-purple-500", border: "border-purple-500" },
  pink: { bg: "bg-pink-500", text: "text-pink-600 dark:text-pink-400", soft: "bg-pink-100 dark:bg-pink-500/15", dot: "bg-pink-500", border: "border-pink-500" },
  orange: { bg: "bg-orange-500", text: "text-orange-600 dark:text-orange-400", soft: "bg-orange-100 dark:bg-orange-500/15", dot: "bg-orange-500", border: "border-orange-500" },
  amber: { bg: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", soft: "bg-amber-100 dark:bg-amber-500/15", dot: "bg-amber-500", border: "border-amber-500" },
  teal: { bg: "bg-teal-500", text: "text-teal-600 dark:text-teal-400", soft: "bg-teal-100 dark:bg-teal-500/15", dot: "bg-teal-500", border: "border-teal-500" },
  green: { bg: "bg-green-500", text: "text-green-600 dark:text-green-400", soft: "bg-green-100 dark:bg-green-500/15", dot: "bg-green-500", border: "border-green-500" },
  red: { bg: "bg-red-500", text: "text-red-600 dark:text-red-400", soft: "bg-red-100 dark:bg-red-500/15", dot: "bg-red-500", border: "border-red-500" },
  indigo: { bg: "bg-indigo-500", text: "text-indigo-600 dark:text-indigo-400", soft: "bg-indigo-100 dark:bg-indigo-500/15", dot: "bg-indigo-500", border: "border-indigo-500" },
  gray: { bg: "bg-gray-500", text: "text-gray-600 dark:text-gray-400", soft: "bg-gray-100 dark:bg-white/10", dot: "bg-gray-500", border: "border-gray-500" },
};

export function colorFor(name: string) {
  return COLOR_CLASSES[name] ?? COLOR_CLASSES.gray;
}

const AVATAR_COLORS = ["blue", "purple", "pink", "orange", "teal", "green", "indigo", "amber", "red"];
export function avatarColor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function downloadText(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function toCSV(rows: (string | number)[][]) {
  return rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}
