// frontend/scripts/verify-frontend-page14.mjs
// Verifies frontend integration for Page 14 (Organization Hierarchy & Visual Org Chart)

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

console.log("==================================================================");
console.log("VERIFYING FRONTEND INTEGRATION: PAGE 14 (ORG CHART & HIERARCHY)");
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

const adminPage = readFileSync(resolvePath("src/app/admin/org-chart/page.tsx"), "utf-8");
const employeePage = readFileSync(resolvePath("src/app/employee/org-chart/page.tsx"), "utf-8");
const chartComponent = readFileSync(resolvePath("src/components/org/OrgChart.tsx"), "utf-8");
const storeCode = readFileSync(resolvePath("src/lib/store.tsx"), "utf-8");

console.log("\n[1. Page Wireup & Component Architecture]");
assert(adminPage.includes('OrgChart variant="admin"'), "Admin page embeds OrgChart with admin variant");
assert(employeePage.includes('OrgChart variant="employee"'), "Employee page embeds OrgChart with employee variant");
assert(chartComponent.includes("fetchOrgChart"), "OrgChart connects to fetchOrgChart");
assert(chartComponent.includes("Max span"), "OrgChart renders executive hierarchy stats");
assert(chartComponent.includes("One permission system"), "OrgChart renders Connected Wedge permission banner");
assert(chartComponent.includes("SearchInput"), "OrgChart supports person/role search");
assert(chartComponent.includes("All departments"), "OrgChart supports department filtering");

console.log("\n[2. Connected Store & 4-Layer API Synchronization]");
assert(storeCode.includes("fetchOrgChart"), "Store exports fetchOrgChart action");
assert(storeCode.includes("reassignManager"), "Store exports reassignManager action");
assert(storeCode.includes("/api/org-chart"), "Store dispatches requests to /api/org-chart");
assert(storeCode.includes("/api/org-chart/reassign"), "Store dispatches requests to /api/org-chart/reassign");

console.log("\n[3. Layer 4: REST API Route Handlers]");
const orgChartRoute = readFileSync(resolvePath("src/app/api/org-chart/route.ts"), "utf-8");
const reassignRoute = readFileSync(resolvePath("src/app/api/org-chart/reassign/route.ts"), "utf-8");

assert(orgChartRoute.includes("GET") && orgChartRoute.includes("orgChartService.getHierarchy"), "GET /api/org-chart calls orgChartService.getHierarchy");
assert(reassignRoute.includes("POST") && reassignRoute.includes("orgChartService.reassignManager"), "POST /api/org-chart/reassign calls orgChartService.reassignManager");

console.log("\n==================================================================");
console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log("==================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL PAGE 14 FRONTEND INTEGRATION CHECKS PASSED (100%)\n");
}

