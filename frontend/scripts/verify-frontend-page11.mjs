// frontend/scripts/verify-frontend-page11.mjs
// Verifies frontend integration for Page 11 (Reports & Executive Analytics Engine)

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

console.log("==================================================================");
console.log("VERIFYING FRONTEND INTEGRATION: PAGE 11 (REPORTS & ANALYTICS)");
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

const reportsPage = readFileSync(resolvePath("src/app/admin/reports/page.tsx"), "utf-8");
const storeCode = readFileSync(resolvePath("src/lib/store.tsx"), "utf-8");

console.log("\n[1. Admin Reports Page UI Wireup]");
assert(reportsPage.includes("Reports & Analytics"), "Admin page renders Reports & Analytics title");
assert(reportsPage.includes("fetchReportsOverview"), "Admin page connects to fetchReportsOverview action");
assert(reportsPage.includes("exportHeadcount"), "Admin page connects to exportHeadcount action");
assert(reportsPage.includes("Headcount by department"), "Admin page renders Headcount by department chart");
assert(reportsPage.includes("Employee status"), "Admin page renders Employee status distribution");
assert(reportsPage.includes("Attendance rate by department"), "Admin page renders Attendance by department card");
assert(reportsPage.includes("Leave utilisation"), "Admin page renders Leave utilisation breakdown");
assert(reportsPage.includes("Payroll cost trend"), "Admin page renders Payroll cost trend card");
assert(reportsPage.includes("Monthly salary cost by department"), "Admin page renders Monthly salary cost by department");
assert(reportsPage.includes("Task throughput by project"), "Admin page renders Task throughput by project");
assert(reportsPage.includes("Top contributors"), "Admin page renders Top contributors ranking");

console.log("\n[2. Connected Store & 4-Layer API Synchronization]");
assert(storeCode.includes("fetchReportsOverview"), "Store exports fetchReportsOverview action");
assert(storeCode.includes("/api/reports/overview"), "Store dispatches requests to /api/reports/overview");

console.log("\n[3. Layer 4: REST API Route Handlers]");
const overviewRoute = readFileSync(resolvePath("src/app/api/reports/overview/route.ts"), "utf-8");
const headcountRoute = readFileSync(resolvePath("src/app/api/reports/headcount/route.ts"), "utf-8");
const attendanceRoute = readFileSync(resolvePath("src/app/api/reports/attendance/route.ts"), "utf-8");
const payrollRoute = readFileSync(resolvePath("src/app/api/reports/payroll/route.ts"), "utf-8");
const exportRoute = readFileSync(resolvePath("src/app/api/reports/export/route.ts"), "utf-8");

assert(overviewRoute.includes("GET"), "GET /api/reports/overview defined");
assert(overviewRoute.includes("reportService.getOverview"), "GET /api/reports/overview calls reportService.getOverview");
assert(headcountRoute.includes("GET"), "GET /api/reports/headcount defined");
assert(headcountRoute.includes("reportService.getHeadcountReport"), "GET /api/reports/headcount calls reportService.getHeadcountReport");
assert(attendanceRoute.includes("GET"), "GET /api/reports/attendance defined");
assert(attendanceRoute.includes("reportService.getAttendanceReport"), "GET /api/reports/attendance calls reportService.getAttendanceReport");
assert(payrollRoute.includes("GET"), "GET /api/reports/payroll defined");
assert(payrollRoute.includes("reportService.getPayrollReport"), "GET /api/reports/payroll calls reportService.getPayrollReport");
assert(exportRoute.includes("GET"), "GET /api/reports/export defined");
assert(exportRoute.includes("reportService.exportCSV"), "GET /api/reports/export calls reportService.exportCSV");

console.log("\n==================================================================");
console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log("==================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL PAGE 11 FRONTEND INTEGRATION CHECKS PASSED (100%)\n");
}

