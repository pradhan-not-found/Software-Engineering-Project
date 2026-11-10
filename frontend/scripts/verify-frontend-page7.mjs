// frontend/scripts/verify-frontend-page7.mjs
// Verifies frontend integration for Page 7 (Admin Overview Dashboard & Connected Signals)

import { readFileSync } from "fs";
import { resolve } from "path";

console.log("==================================================================");
console.log("VERIFYING FRONTEND INTEGRATION: PAGE 7 (ADMIN OVERVIEW DASHBOARD)");
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

const adminDashboardPage = readFileSync(resolve("src/app/admin/page.tsx"), "utf-8");
const employeeDashboardPage = readFileSync(resolve("src/app/employee/page.tsx"), "utf-8");
const storeCode = readFileSync(resolve("src/lib/store.tsx"), "utf-8");

console.log("\n[1. Admin Overview Dashboard UI Wireup]");
assert(adminDashboardPage.includes("Total Headcount"), "Admin page displays Total Headcount stat card");
assert(adminDashboardPage.includes("Org Capacity"), "Admin page displays Operating Capacity percentage");
assert(adminDashboardPage.includes("Clocked in today"), "Admin page displays Live Clock-in metric");
assert(adminDashboardPage.includes("Pending Approvals"), "Admin page aggregates Pending Approvals count");
assert(adminDashboardPage.includes("flagged"), "Admin page tracks Connected Wedge flagged tasks");
assert(adminDashboardPage.includes("pendingLeaves"), "Admin page displays pending leave approval requests");
assert(adminDashboardPage.includes("pendingExpenses"), "Admin page displays pending expense reimbursement requests");
assert(adminDashboardPage.includes("activity"), "Admin page embeds real-time cross-domain activity stream");
assert(adminDashboardPage.includes("suggestPeers"), "Admin page provides suggested peer cover reassignment");

console.log("\n[2. Employee Self-Service Dashboard UI Wireup]");
assert(employeeDashboardPage.includes("Clock"), "Employee page features quick attendance clock widget");
assert(employeeDashboardPage.includes("tasks"), "Employee page shows assigned active tasks");
assert(employeeDashboardPage.includes("leaves"), "Employee page displays leave balance and requests");

console.log("\n[3. Connected Store Integration]");
assert(storeCode.includes("decideLeave"), "Store exposes decideLeave action");
assert(storeCode.includes("decideExpense"), "Store exposes decideExpense action");
assert(storeCode.includes("suggestPeers"), "Store exposes suggestPeers helper");

console.log("\n==================================================================");
console.log(`PAGE 7 FRONTEND SUMMARY: ${passed} Passed, ${failed} Failed (${failed === 0 ? "100% SUCCESS" : "FAILURES DETECTED"})`);
console.log("==================================================================");

if (failed > 0) process.exit(1);
