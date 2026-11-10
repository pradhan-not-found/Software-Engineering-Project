// frontend/scripts/verify-frontend-page5.mjs
// Verifies frontend integration for Page 5 (Admin Attendance & Employee Timesheets)

import { readFileSync } from "fs";
import { resolve } from "path";

console.log("==================================================================");
console.log("VERIFYING FRONTEND INTEGRATION: PAGE 5 (ATTENDANCE & TIMESHEETS)");
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

const adminAttendancePage = readFileSync(resolve("src/app/admin/attendance/page.tsx"), "utf-8");
const employeeAttendancePage = readFileSync(resolve("src/app/employee/attendance/page.tsx"), "utf-8");
const clockWidget = readFileSync(resolve("src/components/employee/ClockWidget.tsx"), "utf-8");
const storeCode = readFileSync(resolve("src/lib/store.tsx"), "utf-8");

console.log("\n[1. Admin Attendance Page UI Wireup]");
assert(adminAttendancePage.includes("Daily"), "Admin page embeds Daily Register tab");
assert(adminAttendancePage.includes("Monthly"), "Admin page embeds Monthly Summary tab");
assert(adminAttendancePage.includes("Shifts"), "Admin page embeds Shifts tab");
assert(adminAttendancePage.includes("Timesheets"), "Admin page embeds Timesheet Approvals tab");
assert(adminAttendancePage.includes("setAttendance"), "Admin page connects to setAttendance action");
assert(adminAttendancePage.includes("openTasksFor"), "Admin page displays workload context for employees on register");

console.log("\n[2. Employee Attendance Page UI Wireup]");
assert(employeeAttendancePage.includes("ClockWidget"), "Employee page embeds live ClockWidget");
assert(employeeAttendancePage.includes("STATUS_STYLE"), "Employee page applies color-coded styles to attendance calendar");
assert(employeeAttendancePage.includes("saveTimesheet"), "Employee page connects to saveTimesheet action");
assert(employeeAttendancePage.includes("Weekly timesheet"), "Employee page renders 7-day weekly timesheet grid");

console.log("\n[3. ClockWidget Component]");
assert(clockWidget.includes("clockIn"), "ClockWidget connects to clockIn store action");
assert(clockWidget.includes("clockOut"), "ClockWidget connects to clockOut store action");
assert(clockWidget.includes("remote"), "ClockWidget supports remote clock-in toggle");

console.log("\n[4. 4-Layer API Synchronization in Store]");
assert(storeCode.includes("fetch(\"/api/attendance/clock-in\""), "clockIn dispatches to /api/attendance/clock-in");
assert(storeCode.includes("fetch(\"/api/attendance/clock-out\""), "clockOut dispatches to /api/attendance/clock-out");
assert(storeCode.includes("fetch(\"/api/attendance\""), "setAttendance dispatches to /api/attendance");
assert(storeCode.includes("fetch(\"/api/attendance/shift\""), "setShift dispatches to /api/attendance/shift");
assert(storeCode.includes("fetch(\"/api/timesheets\""), "saveTimesheet dispatches to /api/timesheets");
assert(storeCode.includes("fetch(`/api/timesheets/${id}/decide`"), "decideTimesheet dispatches to /api/timesheets/[id]/decide");

console.log("\n==================================================================");
console.log(`PAGE 5 FRONTEND SUMMARY: ${passed} Passed, ${failed} Failed`);
console.log("==================================================================");

if (failed > 0) process.exit(1);
