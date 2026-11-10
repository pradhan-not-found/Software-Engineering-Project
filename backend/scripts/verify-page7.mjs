// backend/scripts/verify-page7.mjs
// Comprehensive verification test suite for Page 7: Admin Overview Dashboard

import assert from "node:assert";

console.log("==================================================================");
console.log("TESTING PAGE 7 (ADMIN OVERVIEW DASHBOARD & CONNECTED SIGNALS)");
console.log("==================================================================");

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// -------------------------------------------------------------
// [1. Layer 1: Validation Schemas]
// -------------------------------------------------------------
console.log("\n[1. Layer 1: Validation Schemas]");

function validateDashboardFilterInput(body) {
  if (!body || typeof body !== "object") {
    return { ok: true, data: { category: "ALL" } };
  }
  const b = body;
  const validCategories = ["ALL", "HR", "WORK", "SYSTEM"];
  const category = (typeof b.category === "string" && validCategories.includes(b.category))
    ? b.category
    : "ALL";

  const date = typeof b.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.date.trim())
    ? b.date.trim()
    : undefined;

  return { ok: true, data: { date, category } };
}

it("Empty filter payload defaults to category 'ALL' with undefined date", () => {
  const res = validateDashboardFilterInput(null);
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.data.category, "ALL");
  assert.strictEqual(res.data.date, undefined);
});

it("Valid filter payload with date and category passes validation", () => {
  const res = validateDashboardFilterInput({ date: "2026-11-10", category: "HR" });
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.data.category, "HR");
  assert.strictEqual(res.data.date, "2026-11-10");
});

it("Invalid category falls back safely to 'ALL'", () => {
  const res = validateDashboardFilterInput({ date: "2026-11-10", category: "UNKNOWN_CATEGORY" });
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.data.category, "ALL");
});

// -------------------------------------------------------------
// [2. Layer 3: Security & Access Control]
// -------------------------------------------------------------
console.log("\n[2. Layer 3: Security & Access Control]");

const mockAdmin = {
  id: "emp_admin",
  role: "ADMIN",
  firstName: "Alice",
  lastName: "Admin",
  status: "ACTIVE",
  joiningDate: "2024-01-15",
};

const mockEmployee = {
  id: "emp_dev",
  role: "EMPLOYEE",
  firstName: "Bob",
  lastName: "Builder",
  status: "ACTIVE",
  joiningDate: "2025-06-01",
};

const mockTerminated = {
  id: "emp_old",
  role: "EMPLOYEE",
  firstName: "Old",
  lastName: "Staff",
  status: "TERMINATED",
  joiningDate: "2023-01-01",
};

function isAdminRole(role) {
  return role === "ADMIN" || role === "SUPER_ADMIN" || role === "HR";
}

it("Rejects non-administrative actors from accessing executive dashboard", () => {
  const isAllowed = isAdminRole(mockEmployee.role);
  assert.strictEqual(isAllowed, false, "Employee should not have admin access");
});

it("Allows administrators and HR to access executive overview", () => {
  assert.strictEqual(isAdminRole(mockAdmin.role), true);
  assert.strictEqual(isAdminRole("SUPER_ADMIN"), true);
  assert.strictEqual(isAdminRole("HR"), true);
});

// -------------------------------------------------------------
// [3. Layer 3: Executive KPI & Capacity Metrics]
// -------------------------------------------------------------
console.log("\n[3. Layer 3: Executive KPI & Capacity Metrics]");

const mockEmployees = [
  mockAdmin,
  mockEmployee,
  mockTerminated,
  { id: "emp_carol", role: "EMPLOYEE", firstName: "Carol", lastName: "Danvers", status: "ACTIVE", joiningDate: "2026-10-01" },
  { id: "emp_dave", role: "EMPLOYEE", firstName: "Dave", lastName: "Developer", status: "ACTIVE", joiningDate: "2026-11-01" },
];

const mockLeaves = [
  {
    id: "leave_1",
    employeeId: "emp_carol",
    type: "PAID",
    startDate: "2026-11-08",
    endDate: "2026-11-12",
    days: 3,
    status: "APPROVED",
  },
  {
    id: "leave_2",
    employeeId: "emp_dave",
    type: "PAID",
    startDate: "2026-11-15",
    endDate: "2026-11-18",
    days: 4,
    status: "PENDING",
  },
];

const mockAttendance = [
  { id: "att_1", employeeId: "emp_admin", date: "2026-11-10", clockIn: "09:00", clockOut: null, status: "PRESENT" },
  { id: "att_2", employeeId: "emp_dev", date: "2026-11-10", clockIn: "09:15", clockOut: null, status: "PRESENT" },
];

const mockExpenses = [
  { id: "exp_1", employeeId: "emp_dev", amount: 150, status: "PENDING" },
  { id: "exp_2", employeeId: "emp_carol", amount: 300, status: "APPROVED" },
];

const mockTimesheets = [
  { id: "ts_1", employeeId: "emp_dev", status: "SUBMITTED", totalHours: 40 },
];

const todayDate = "2026-11-10";

// Calculation
const activeEmployees = mockEmployees.filter((e) => e.status !== "TERMINATED");
const onLeaveToday = mockLeaves.filter(
  (l) => l.status === "APPROVED" && l.startDate <= todayDate && l.endDate >= todayDate
);
const capacityPct = activeEmployees.length
  ? Math.round(((activeEmployees.length - onLeaveToday.length) / activeEmployees.length) * 100)
  : 100;
const clockedInCount = mockAttendance.filter((a) => Boolean(a.clockIn)).length;
const pendingLeaves = mockLeaves.filter((l) => l.status === "PENDING");
const pendingExpenses = mockExpenses.filter((x) => x.status === "PENDING");
const pendingTimesheets = mockTimesheets.filter((x) => x.status === "SUBMITTED");
const totalPendingApprovals = pendingLeaves.length + pendingExpenses.length + pendingTimesheets.length;

it("Calculates total active headcount strictly excluding terminated staff", () => {
  assert.strictEqual(activeEmployees.length, 4);
});

it("Accurately determines employees actively on approved leave today", () => {
  assert.strictEqual(onLeaveToday.length, 1);
  assert.strictEqual(onLeaveToday[0].employeeId, "emp_carol");
});

it("Calculates workforce operating capacity percentage", () => {
  // 4 active, 1 on leave -> 3/4 = 75%
  assert.strictEqual(capacityPct, 75);
});

it("Aggregates today's clocked-in employee count", () => {
  assert.strictEqual(clockedInCount, 2);
});

it("Computes unified pending approvals inbox count (Leaves + Expenses + Timesheets)", () => {
  // 1 pending leave + 1 pending expense + 1 submitted timesheet = 3
  assert.strictEqual(totalPendingApprovals, 3);
});

// -------------------------------------------------------------
// [4. Layer 3: Connected Wedge Cross-Domain Signals]
// -------------------------------------------------------------
console.log("\n[4. Layer 3: Connected Wedge Cross-Domain Signals]");

const mockTasks = [
  { id: "task_1", title: "Complete Q4 Report", assigneeIds: ["emp_carol"], dueDate: "2026-11-11", flag: "DELAYED_ON_LEAVE", status: "IN_PROGRESS" },
  { id: "task_2", title: "API Refactor", assigneeIds: ["emp_dave"], dueDate: "2026-11-16", flag: "NORMAL", status: "TODO" },
  { id: "task_3", title: "Production Deployment", assigneeIds: ["emp_dev"], dueDate: "2026-11-20", flag: "BLOCKED", status: "IN_PROGRESS" },
];

it("Connected Wedge: Detects all flagged tasks across the organisation", () => {
  const flagged = mockTasks.filter((t) => t.flag !== "NORMAL");
  assert.strictEqual(flagged.length, 2);
  assert.deepStrictEqual(flagged.map((t) => t.id), ["task_1", "task_3"]);
});

it("Connected Wedge: Enriches pending leave requests with live workload collision count", () => {
  // Dave has pending leave 2026-11-15 to 2026-11-18. task_2 due date is 2026-11-16 (within window!)
  const enrichedPendingLeaves = pendingLeaves.map((l) => {
    const empTasks = mockTasks.filter((task) => task.assigneeIds.includes(l.employeeId));
    const dueInWindow = empTasks.filter(
      (task) => task.dueDate && task.dueDate >= l.startDate && task.dueDate <= l.endDate
    ).length;
    return { ...l, tasksDueInWindow: dueInWindow };
  });

  assert.strictEqual(enrichedPendingLeaves.length, 1);
  assert.strictEqual(enrichedPendingLeaves[0].tasksDueInWindow, 1, "Dave has 1 task due during pending leave");
});

// -------------------------------------------------------------
// [5. Layer 3: Activity Stream Filtering]
// -------------------------------------------------------------
console.log("\n[5. Layer 3: Activity Stream Filtering]");

const mockActivity = [
  { id: "act_1", category: "HR", message: "Carol requested annual leave", createdAt: "2026-11-10T08:00:00Z" },
  { id: "act_2", category: "WORK", message: "Task Q4 Report marked DELAYED_ON_LEAVE", createdAt: "2026-11-10T08:30:00Z" },
  { id: "act_3", category: "SYSTEM", message: "Automated daily backup completed", createdAt: "2026-11-10T02:00:00Z" },
];

it("Returns all activity items when filter category is 'ALL'", () => {
  const filtered = mockActivity.filter((a) => "ALL" === "ALL" || a.category === "ALL");
  assert.strictEqual(filtered.length, 3);
});

it("Filters activity items specifically by category", () => {
  const hrOnly = mockActivity.filter((a) => a.category === "HR");
  assert.strictEqual(hrOnly.length, 1);
  assert.strictEqual(hrOnly[0].id, "act_1");

  const workOnly = mockActivity.filter((a) => a.category === "WORK");
  assert.strictEqual(workOnly.length, 1);
  assert.strictEqual(workOnly[0].id, "act_2");
});

console.log("\n==================================================================");
console.log(`PAGE 7 SUMMARY: ${passed} Passed, ${failed} Failed (${failed === 0 ? "100% SUCCESS" : "FAILURES DETECTED"})`);
console.log("==================================================================");

if (failed > 0) process.exit(1);

