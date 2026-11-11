// frontend/scripts/verify-frontend-page9.mjs
// Verifies frontend integration for Page 9 (Performance Management)

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

console.log("==================================================================");
console.log("VERIFYING FRONTEND INTEGRATION: PAGE 9 (PERFORMANCE MANAGEMENT)");
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

const adminPage = readFileSync(resolvePath("src/app/admin/performance/page.tsx"), "utf-8");
const employeePage = readFileSync(resolvePath("src/app/employee/performance/page.tsx"), "utf-8");
const storeCode = readFileSync(resolvePath("src/lib/store.tsx"), "utf-8");

console.log("\n[1. Admin Performance Management Page Wireup]");
assert(adminPage.includes("createCycle"), "Admin page connects to createCycle store action");
assert(adminPage.includes("closeCycle"), "Admin page connects to closeCycle store action");
assert(adminPage.includes("submitManagerReview"), "Admin page connects to submitManagerReview in modal");
assert(adminPage.includes("PerformanceMetrics"), "Admin review modal embeds PerformanceMetrics Connected Wedge");
assert(adminPage.includes("Review cycles pre-populated with real task delivery data"), "Admin page displays subtitle indicating objective work data");
assert(adminPage.includes("Rating Distribution"), "Admin page includes rating calibration & distribution tab");

console.log("\n[2. Employee Performance & Goals Self-Service Wireup]");
assert(employeePage.includes("saveGoal"), "Employee page connects to saveGoal store action");
assert(employeePage.includes("deleteGoal"), "Employee page connects to deleteGoal store action");
assert(employeePage.includes("submitSelfReview"), "Employee page connects to submitSelfReview store action");
assert(employeePage.includes("addPeerFeedback"), "Employee page connects to addPeerFeedback store action");
assert(employeePage.includes("PerformanceMetrics"), "Employee page features PerformanceMetrics for self assessment");
assert(employeePage.includes("toggleKr"), "Employee page supports interactive checklist key result progress");

console.log("\n[3. Connected Store & 4-Layer API Synchronization]");
assert(storeCode.includes("saveGoal"), "Store exports saveGoal action");
assert(storeCode.includes("deleteGoal"), "Store exports deleteGoal action");
assert(storeCode.includes("createCycle"), "Store exports createCycle action");
assert(storeCode.includes("closeCycle"), "Store exports closeCycle action");
assert(storeCode.includes("submitSelfReview"), "Store exports submitSelfReview action");
assert(storeCode.includes("submitManagerReview"), "Store exports submitManagerReview action");
assert(storeCode.includes("addPeerFeedback"), "Store exports addPeerFeedback action");
assert(storeCode.includes("/api/performance/cycles"), "Store dispatches review cycles to /api/performance/cycles");
assert(storeCode.includes("/api/performance/reviews/"), "Store dispatches reviews to /api/performance/reviews API");
assert(storeCode.includes("/api/performance/goals"), "Store dispatches goals to /api/performance/goals API");

console.log("\n[4. Layer 4: REST API Route Handlers]");
const cyclesRoute = readFileSync(resolvePath("src/app/api/performance/cycles/route.ts"), "utf-8");
const cycleIdRoute = readFileSync(resolvePath("src/app/api/performance/cycles/[id]/route.ts"), "utf-8");
const reviewsRoute = readFileSync(resolvePath("src/app/api/performance/reviews/route.ts"), "utf-8");
const reviewIdRoute = readFileSync(resolvePath("src/app/api/performance/reviews/[id]/route.ts"), "utf-8");
const selfReviewRoute = readFileSync(resolvePath("src/app/api/performance/reviews/[id]/self/route.ts"), "utf-8");
const managerReviewRoute = readFileSync(resolvePath("src/app/api/performance/reviews/[id]/manager/route.ts"), "utf-8");
const peerReviewRoute = readFileSync(resolvePath("src/app/api/performance/reviews/[id]/peer/route.ts"), "utf-8");
const goalsRoute = readFileSync(resolvePath("src/app/api/performance/goals/route.ts"), "utf-8");
const goalIdRoute = readFileSync(resolvePath("src/app/api/performance/goals/[id]/route.ts"), "utf-8");

assert(cyclesRoute.includes("GET") && cyclesRoute.includes("POST"), "GET and POST /api/performance/cycles defined");
assert(cycleIdRoute.includes("GET") && cycleIdRoute.includes("PATCH"), "GET and PATCH /api/performance/cycles/[id] defined");
assert(reviewsRoute.includes("GET"), "GET /api/performance/reviews defined");
assert(reviewIdRoute.includes("getObjectiveWorkData"), "GET /api/performance/reviews/[id] delivers objective work data");
assert(selfReviewRoute.includes("POST"), "POST /api/performance/reviews/[id]/self defined");
assert(managerReviewRoute.includes("POST"), "POST /api/performance/reviews/[id]/manager defined");
assert(peerReviewRoute.includes("POST"), "POST /api/performance/reviews/[id]/peer defined");
assert(goalsRoute.includes("GET") && goalsRoute.includes("POST"), "GET and POST /api/performance/goals defined");
assert(goalIdRoute.includes("PATCH") && goalIdRoute.includes("DELETE"), "PATCH and DELETE /api/performance/goals/[id] defined");

console.log("\n==================================================================");
console.log(`PAGE 9 FRONTEND SUMMARY: ${passed} Passed, ${failed} Failed (${failed === 0 ? "100% SUCCESS" : "FAILURES DETECTED"})`);
console.log("==================================================================");

if (failed > 0) {
  process.exit(1);
}
