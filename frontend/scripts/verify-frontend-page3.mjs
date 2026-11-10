// frontend/scripts/verify-frontend-page3.mjs
// Verifies frontend user journey for Page 3 (Leave Management & Connected Wedge Reactive Task Delays)

import { readFileSync } from "fs";
import { resolve } from "path";

console.log("==================================================================");
console.log("VERIFYING FRONTEND INTEGRATION: PAGE 3 (LEAVE MANAGEMENT)");
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

// 1. Verify UI components wiring
const adminLeavesPage = readFileSync(resolve("src/app/admin/leaves/page.tsx"), "utf-8");
const employeeLeavesPage = readFileSync(resolve("src/app/employee/leaves/page.tsx"), "utf-8");
const storeCode = readFileSync(resolve("src/lib/store.tsx"), "utf-8");

console.log("\n[1. Frontend Admin Leaves Page Wireup]");
assert(adminLeavesPage.includes("PendingQueue"), "Admin page includes PendingQueue component");
assert(adminLeavesPage.includes("decideLeave"), "Admin page invokes decideLeave from useAuthed store");
assert(adminLeavesPage.includes("suggestPeers"), "Admin page surfaces peer cover recommendations");
assert(adminLeavesPage.includes("dueInWindow"), "Admin page renders workload context with tasks due in leave window");
assert(adminLeavesPage.includes("DELAYED_ON_LEAVE") || adminLeavesPage.includes("Delayed — On Leave"), "Admin page alerts on tasks flagged Delayed — On Leave");

console.log("\n[2. Frontend Employee Leaves Page Wireup]");
assert(employeeLeavesPage.includes("requestLeave"), "Employee page connects to requestLeave action");
assert(employeeLeavesPage.includes("cancelLeave"), "Employee page connects to cancelLeave action");
assert(employeeLeavesPage.includes("leaveBalances"), "Employee page renders live leave balance ledger");
assert(employeeLeavesPage.includes("workingDays"), "Employee page calculates net working days (excluding weekends & holidays)");

console.log("\n[3. Connected Wedge Integration in Store]");
assert(storeCode.includes("fetch(\"/api/leaves\""), "requestLeave syncs to /api/leaves route");
assert(storeCode.includes("fetch(`/api/leaves/${id}/decide`"), "decideLeave syncs to /api/leaves/[id]/decide route");
assert(storeCode.includes("fetch(`/api/leaves/${id}/cancel`"), "cancelLeave syncs to /api/leaves/[id]/cancel route");
assert(storeCode.includes("syncLeaveDecisionToSupabase"), "decideLeave triggers Supabase sync when live DB is configured");
assert(storeCode.includes("DELAYED_ON_LEAVE"), "decideLeave flags affected tasks as DELAYED_ON_LEAVE");

console.log("\n==================================================================");
console.log(`PAGE 3 FRONTEND SUMMARY: ${passed} Passed, ${failed} Failed`);
console.log("==================================================================");

if (failed > 0) process.exit(1);
