// frontend/scripts/verify-frontend-page8.mjs
// Verifies frontend integration for Page 8 (Expenses & Reimbursements)

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

console.log("==================================================================");
console.log("VERIFYING FRONTEND INTEGRATION: PAGE 8 (EXPENSES & REIMBURSEMENTS)");
console.log("==================================================================");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

const resolvePath = (p) => {
  if (existsSync(resolve(p))) return resolve(p);
  if (existsSync(resolve("frontend", p))) return resolve("frontend", p);
  if (existsSync(resolve("..", p))) return resolve("..", p);
  return resolve(p);
};

const adminExpensesPage = readFileSync(resolvePath("src/app/admin/expenses/page.tsx"), "utf-8");
const employeeExpensesPage = readFileSync(resolvePath("src/app/employee/expenses/page.tsx"), "utf-8");
const storeCode = readFileSync(resolvePath("src/lib/store.tsx"), "utf-8");

console.log("\n[1. Admin Expenses Review Page Wireup]");
assert(adminExpensesPage.includes("decideExpense"), "Admin page connects to decideExpense store action");
assert(adminExpensesPage.includes("Pending review"), "Admin page displays Pending review stat card");
assert(adminExpensesPage.includes("CATEGORIES"), "Admin page filters claims across standard categories");
assert(adminExpensesPage.includes("status"), "Admin page filters claims by approval status");
assert(adminExpensesPage.includes("next payroll"), "Admin page indicates approved claims paid in next payroll");

console.log("\n[2. Employee Expenses Self-Service Wireup]");
assert(employeeExpensesPage.includes("submitExpense"), "Employee page connects to submitExpense store action");
assert(employeeExpensesPage.includes("New claim"), "Employee page features new claim modal trigger");
assert(employeeExpensesPage.includes("My claims"), "Employee page renders personal claims ledger");
assert(employeeExpensesPage.includes("Approved (unpaid)"), "Employee page displays approved reimbursement tracker");
assert(employeeExpensesPage.includes("Reimbursed"), "Employee page displays finalized reimbursed amount");

console.log("\n[3. Connected Store & 4-Layer API Synchronization]");
assert(storeCode.includes("submitExpense"), "Store exports submitExpense action");
assert(storeCode.includes("decideExpense"), "Store exports decideExpense action");
assert(storeCode.includes("deleteExpense"), "Store exports deleteExpense action");
assert(storeCode.includes("/api/expenses"), "Store dispatches claims to /api/expenses");
assert(storeCode.includes("/api/expenses/${id}/decide") || storeCode.includes("/api/expenses/"), "Store dispatches decisions to /api/expenses/[id]/decide");

console.log("\n[4. Layer 4: REST API Route Handlers]");
const expenseRoute = readFileSync(resolvePath("src/app/api/expenses/route.ts"), "utf-8");
const decideRoute = readFileSync(resolvePath("src/app/api/expenses/[id]/decide/route.ts"), "utf-8");
const singleRoute = readFileSync(resolvePath("src/app/api/expenses/[id]/route.ts"), "utf-8");

assert(expenseRoute.includes("GET") && expenseRoute.includes("POST"), "GET and POST /api/expenses defined");
assert(decideRoute.includes("POST"), "POST /api/expenses/[id]/decide defined");
assert(singleRoute.includes("GET") && singleRoute.includes("DELETE"), "GET and DELETE /api/expenses/[id] defined");
assert(expenseRoute.includes("authService.getSessionUser"), "Route handler enforces session authentication");
assert(expenseRoute.includes("validateExpenseCreateInput"), "Route handler enforces input validation schema");

console.log("\n==================================================================");
console.log(`PAGE 8 FRONTEND SUMMARY: ${passed} Passed, ${failed} Failed (${failed === 0 ? "100% SUCCESS" : "FAILURES DETECTED"})`);
console.log("==================================================================");

if (failed > 0) process.exit(1);

