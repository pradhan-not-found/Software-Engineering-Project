// frontend/scripts/verify-frontend-page12.mjs
// Verifies frontend integration for Page 12 (Organization Settings, Workspaces & Holiday Calendar)

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

console.log("==================================================================");
console.log("VERIFYING FRONTEND INTEGRATION: PAGE 12 (SETTINGS & HOLIDAYS)");
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

const settingsPage = readFileSync(resolvePath("src/app/admin/settings/page.tsx"), "utf-8");
const storeCode = readFileSync(resolvePath("src/lib/store.tsx"), "utf-8");

console.log("\n[1. Admin Settings Page UI Wireup]");
assert(settingsPage.includes("Organization Settings"), "Admin page renders Organization Settings title");
assert(settingsPage.includes("fetchSettingsOverview"), "Admin page connects to fetchSettingsOverview action");
assert(settingsPage.includes("updateOrg"), "Admin page wires updateOrg for workspace modifications");
assert(settingsPage.includes("addHoliday"), "Admin page wires addHoliday for company calendar");
assert(settingsPage.includes("removeHoliday"), "Admin page wires removeHoliday for company calendar");
assert(settingsPage.includes("resetDemo"), "Admin page wires resetDemo in danger zone");
assert(settingsPage.includes("DepartmentModal"), "Admin page renders DepartmentModal for department creation");
assert(settingsPage.includes("Holiday calendar"), "Admin page renders Holiday calendar section");
assert(settingsPage.includes("Demo accounts"), "Admin page renders Demo accounts overview");

console.log("\n[2. Connected Store & 4-Layer API Synchronization]");
assert(storeCode.includes("fetchSettingsOverview"), "Store exports fetchSettingsOverview action");
assert(storeCode.includes("/api/settings/overview"), "Store dispatches requests to /api/settings/overview");
assert(storeCode.includes("/api/settings/org"), "Store dispatches requests to /api/settings/org");
assert(storeCode.includes("/api/settings/departments") || storeCode.includes("/api/departments"), "Store dispatches requests to department API");
assert(storeCode.includes("/api/settings/holidays"), "Store dispatches requests to /api/settings/holidays");
assert(storeCode.includes("/api/settings/reset-demo"), "Store dispatches requests to /api/settings/reset-demo");

console.log("\n[3. Layer 4: REST API Route Handlers]");
const overviewRoute = readFileSync(resolvePath("src/app/api/settings/overview/route.ts"), "utf-8");
const orgRoute = readFileSync(resolvePath("src/app/api/settings/org/route.ts"), "utf-8");
const deptsRoute = readFileSync(resolvePath("src/app/api/settings/departments/route.ts"), "utf-8");
const holidaysRoute = readFileSync(resolvePath("src/app/api/settings/holidays/route.ts"), "utf-8");
const holidayDetailRoute = readFileSync(resolvePath("src/app/api/settings/holidays/[id]/route.ts"), "utf-8");
const resetRoute = readFileSync(resolvePath("src/app/api/settings/reset-demo/route.ts"), "utf-8");
const legacyDeptRoute = readFileSync(resolvePath("src/app/api/departments/route.ts"), "utf-8");

assert(overviewRoute.includes("GET") && overviewRoute.includes("settingsService.getSettingsOverview"), "GET /api/settings/overview calls settingsService.getSettingsOverview");
assert(orgRoute.includes("GET") && orgRoute.includes("settingsService.getSettingsOverview"), "GET /api/settings/org calls settingsService.getSettingsOverview");
assert(orgRoute.includes("PATCH") && orgRoute.includes("settingsService.updateOrg"), "PATCH /api/settings/org calls settingsService.updateOrg");
assert(deptsRoute.includes("GET") && deptsRoute.includes("settingsRepository.getDepartments"), "GET /api/settings/departments calls settingsRepository.getDepartments");
assert(deptsRoute.includes("POST") && deptsRoute.includes("settingsService.createDepartment"), "POST /api/settings/departments calls settingsService.createDepartment");
assert(holidaysRoute.includes("GET") && holidaysRoute.includes("settingsRepository.getHolidays"), "GET /api/settings/holidays calls settingsRepository.getHolidays");
assert(holidaysRoute.includes("POST") && holidaysRoute.includes("settingsService.createHoliday"), "POST /api/settings/holidays calls settingsService.createHoliday");
assert(holidayDetailRoute.includes("DELETE") && holidayDetailRoute.includes("settingsService.deleteHoliday"), "DELETE /api/settings/holidays/[id] calls settingsService.deleteHoliday");
assert(resetRoute.includes("POST") && resetRoute.includes("settingsService.resetDemo"), "POST /api/settings/reset-demo calls settingsService.resetDemo");
assert(legacyDeptRoute.includes("POST") && legacyDeptRoute.includes("settingsService.createDepartment"), "POST /api/departments calls settingsService.createDepartment");

console.log("\n==================================================================");
console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log("==================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL PAGE 12 FRONTEND INTEGRATION CHECKS PASSED (100%)\n");
}
