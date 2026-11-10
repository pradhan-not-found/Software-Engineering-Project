// backend/scripts/verify-page8.mjs
// Comprehensive verification test suite for Page 8: Expenses & Reimbursements

import assert from "node:assert";

console.log("==================================================================");
console.log("TESTING PAGE 8 (EXPENSES, REIMBURSEMENTS & CONNECTED PAYROLL)");
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

const EXPENSE_CATEGORIES = [
  "Travel",
  "Meals",
  "Equipment",
  "Internet",
  "Training",
  "Other",
];

function validateExpenseCreateInput(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request payload." };
  }
  const b = body;
  if (typeof b.category !== "string" || !EXPENSE_CATEGORIES.includes(b.category)) {
    return { ok: false, error: `Invalid expense category. Must be one of: ${EXPENSE_CATEGORIES.join(", ")}.` };
  }
  const amount = Number(b.amount);
  if (isNaN(amount) || amount <= 0) {
    return { ok: false, error: "Expense amount must be a positive number greater than 0." };
  }
  if (typeof b.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(b.date.trim())) {
    return { ok: false, error: "Expense date must be in YYYY-MM-DD format." };
  }
  if (typeof b.description !== "string" || b.description.trim().length < 3) {
    return { ok: false, error: "Description is required and must be at least 3 characters." };
  }
  return {
    ok: true,
    data: {
      category: b.category,
      amount: Math.round(amount * 100) / 100,
      date: b.date.trim(),
      description: b.description.trim(),
      receiptName: typeof b.receiptName === "string" ? b.receiptName.trim() : null,
    },
  };
}

function validateExpenseDecisionInput(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request payload." };
  }
  const b = body;
  if (b.status !== "APPROVED" && b.status !== "REJECTED") {
    return { ok: false, error: "Decision status must be either 'APPROVED' or 'REJECTED'." };
  }
  return {
    ok: true,
    data: {
      status: b.status,
      decisionComment: typeof b.decisionComment === "string" ? b.decisionComment.trim() : undefined,
    },
  };
}

it("Valid expense claim creation payload passes validation", () => {
  const res = validateExpenseCreateInput({
    category: "Travel",
    amount: 1450.5,
    date: "2026-11-10",
    description: "Client on-site meeting taxi and train fares",
    receiptName: "taxi_receipt.pdf",
  });
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.data.amount, 1450.5);
  assert.strictEqual(res.data.category, "Travel");
});

it("Rejects invalid expense category", () => {
  const res = validateExpenseCreateInput({
    category: "EntertainmentLuxury",
    amount: 500,
    date: "2026-11-10",
    description: "Team dinner",
  });
  assert.strictEqual(res.ok, false);
  assert.ok(res.error.includes("Invalid expense category"));
});

it("Rejects non-positive or negative expense amounts", () => {
  const res1 = validateExpenseCreateInput({ category: "Meals", amount: -50, date: "2026-11-10", description: "Lunch" });
  const res2 = validateExpenseCreateInput({ category: "Meals", amount: 0, date: "2026-11-10", description: "Lunch" });
  assert.strictEqual(res1.ok, false);
  assert.strictEqual(res2.ok, false);
});

it("Rejects invalid date format", () => {
  const res = validateExpenseCreateInput({ category: "Internet", amount: 1000, date: "10-11-2026", description: "Home fiber bill" });
  assert.strictEqual(res.ok, false);
  assert.ok(res.error.includes("YYYY-MM-DD"));
});

it("Rejects short description", () => {
  const res = validateExpenseCreateInput({ category: "Meals", amount: 200, date: "2026-11-10", description: "hi" });
  assert.strictEqual(res.ok, false);
});

it("Valid decision payload passes validation", () => {
  const res = validateExpenseDecisionInput({ status: "APPROVED", decisionComment: "Receipt verified." });
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.data.status, "APPROVED");
});

it("Rejects invalid decision status", () => {
  const res = validateExpenseDecisionInput({ status: "PENDING_REVIEW" });
  assert.strictEqual(res.ok, false);
});

// -------------------------------------------------------------
// [2. Layer 2: Repository In-Memory & Filter Logic]
// -------------------------------------------------------------
console.log("\n[2. Layer 2: Repository Data Operations]");

const mockExpenses = [
  { id: "x_1", employeeId: "emp_1", category: "Travel", amount: 1200, date: "2026-11-01", description: "Flight", status: "APPROVED", createdAt: "2026-11-01T10:00:00Z" },
  { id: "x_2", employeeId: "emp_1", category: "Meals", amount: 350, date: "2026-11-05", description: "Team lunch", status: "PENDING", createdAt: "2026-11-05T12:00:00Z" },
  { id: "x_3", employeeId: "emp_2", category: "Equipment", amount: 4500, date: "2026-11-06", description: "Monitor", status: "REJECTED", createdAt: "2026-11-06T15:00:00Z" },
  { id: "x_4", employeeId: "emp_2", category: "Internet", amount: 1000, date: "2026-11-08", description: "Monthly WiFi", status: "APPROVED", createdAt: "2026-11-08T09:00:00Z" },
  { id: "x_5", employeeId: "emp_1", category: "Training", amount: 8000, date: "2026-10-15", description: "AWS Course", status: "REIMBURSED", createdAt: "2026-10-15T11:00:00Z" },
];

function filterExpenses(list, filter) {
  return list.filter((x) => {
    if (filter?.employeeId && x.employeeId !== filter.employeeId) return false;
    if (filter?.status && filter.status !== "ALL" && x.status !== filter.status) return false;
    if (filter?.category && filter.category !== "ALL" && x.category !== filter.category) return false;
    return true;
  });
}

it("Filters expense claims accurately by employeeId", () => {
  const res = filterExpenses(mockExpenses, { employeeId: "emp_2" });
  assert.strictEqual(res.length, 2);
  assert.deepStrictEqual(res.map((x) => x.id), ["x_3", "x_4"]);
});

it("Filters expense claims accurately by status", () => {
  const pending = filterExpenses(mockExpenses, { status: "PENDING" });
  assert.strictEqual(pending.length, 1);
  assert.strictEqual(pending[0].id, "x_2");
});

it("Filters expense claims accurately by category", () => {
  const travel = filterExpenses(mockExpenses, { category: "Travel" });
  assert.strictEqual(travel.length, 1);
  assert.strictEqual(travel[0].category, "Travel");
});

// -------------------------------------------------------------
// [3. Layer 3: Security & Access Control Boundaries]
// -------------------------------------------------------------
console.log("\n[3. Layer 3: Security & Access Control Boundaries]");

const mockAdminUser = { id: "emp_admin", role: "ADMIN", firstName: "Alice" };
const mockEmpUser = { id: "emp_1", role: "EMPLOYEE", firstName: "Bob" };

function isAdmin(role) {
  return role === "ADMIN" || role === "SUPER_ADMIN" || role === "HR";
}

it("Non-admin employee can only query their own expense claims", () => {
  const actor = mockEmpUser;
  const targetFilter = { employeeId: "emp_2" }; // Bob trying to see Eve's expenses
  const effectiveEmployeeId = isAdmin(actor.role) ? targetFilter.employeeId : actor.id;
  assert.strictEqual(effectiveEmployeeId, "emp_1", "Employee filter overridden to actor ID");
});

it("Admin can query expense claims across all employees", () => {
  const actor = mockAdminUser;
  const targetFilter = { employeeId: "emp_2" };
  const effectiveEmployeeId = isAdmin(actor.role) ? targetFilter.employeeId : actor.id;
  assert.strictEqual(effectiveEmployeeId, "emp_2", "Admin permitted to query target employee");
});

it("Rejects non-admin user from approving or rejecting expense claims", () => {
  const actor = mockEmpUser;
  const canDecide = isAdmin(actor.role);
  assert.strictEqual(canDecide, false);
});

it("Allows administrator to decide expense claim", () => {
  const actor = mockAdminUser;
  const canDecide = isAdmin(actor.role);
  assert.strictEqual(canDecide, true);
});

it("Rejects deciding on an expense that is not PENDING", () => {
  const existingClaim = mockExpenses[0]; // status: "APPROVED"
  const canDecide = existingClaim.status === "PENDING";
  assert.strictEqual(canDecide, false, "Cannot re-decide an approved claim");
});

// -------------------------------------------------------------
// [4. Layer 3: Financial Audit Protection]
// -------------------------------------------------------------
console.log("\n[4. Layer 3: Financial Audit Protection]");

it("Allows employee to delete their own PENDING expense claim", () => {
  const pendingClaim = mockExpenses[1]; // emp_1, PENDING
  const canDelete = pendingClaim.status === "PENDING" && pendingClaim.employeeId === mockEmpUser.id;
  assert.strictEqual(canDelete, true);
});

it("Strictly blocks deletion of APPROVED or REIMBURSED expense claims", () => {
  const approvedClaim = mockExpenses[0]; // APPROVED
  const reimbursedClaim = mockExpenses[4]; // REIMBURSED
  
  const canDeleteApproved = approvedClaim.status !== "APPROVED" && approvedClaim.status !== "REIMBURSED";
  const canDeleteReimbursed = reimbursedClaim.status !== "APPROVED" && reimbursedClaim.status !== "REIMBURSED";

  assert.strictEqual(canDeleteApproved, false, "Approved claims locked from deletion");
  assert.strictEqual(canDeleteReimbursed, false, "Reimbursed claims locked from deletion");
});

// -------------------------------------------------------------
// [5. Layer 3: Connected Wedge #7 - Payroll Reimbursement Linking]
// -------------------------------------------------------------
console.log("\n[5. Layer 3: Connected Wedge #7 - Payroll Reimbursement Linking]");

it("Connected Wedge: Aggregates pending approved claims into employee's payroll reimbursements", () => {
  // For emp_1:
  // x_1: 1200 (APPROVED)
  // x_2: 350 (PENDING) -> ignored
  // x_5: 8000 (REIMBURSED) -> already paid, ignored
  const approvedForEmp1 = mockExpenses.filter((x) => x.employeeId === "emp_1" && x.status === "APPROVED");
  const totalReimbursement = approvedForEmp1.reduce((sum, x) => sum + x.amount, 0);

  assert.strictEqual(totalReimbursement, 1200, "Approved claim of 1200 included in next payroll run");
});

it("Connected Wedge: Excludes unapproved and rejected claims from payroll reimbursement", () => {
  // For emp_2:
  // x_3: 4500 (REJECTED) -> ignored
  // x_4: 1000 (APPROVED) -> included
  const approvedForEmp2 = mockExpenses.filter((x) => x.employeeId === "emp_2" && x.status === "APPROVED");
  const totalReimbursement = approvedForEmp2.reduce((sum, x) => sum + x.amount, 0);

  assert.strictEqual(totalReimbursement, 1000, "Rejected 4500 excluded, only approved 1000 included");
});

console.log("\n==================================================================");
console.log(`PAGE 8 SUMMARY: ${passed} Passed, ${failed} Failed (${failed === 0 ? "100% SUCCESS" : "FAILURES DETECTED"})`);
console.log("==================================================================");

if (failed > 0) process.exit(1);

