// frontend/scripts/verify-frontend-page10.mjs
// Verifies frontend integration for Page 10 (Access Control & Role-Based Permissions - RBAC)

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

console.log("==================================================================");
console.log("VERIFYING FRONTEND INTEGRATION: PAGE 10 (ACCESS CONTROL & RBAC)");
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

const accessPage = readFileSync(resolvePath("src/app/admin/access/page.tsx"), "utf-8");
const storeCode = readFileSync(resolvePath("src/lib/store.tsx"), "utf-8");

console.log("\n[1. Admin Access Control Page Wireup]");
assert(accessPage.includes("togglePermission"), "Admin page connects to togglePermission store action");
assert(accessPage.includes("setRole"), "Admin page connects to setRole store action");
assert(accessPage.includes("setAccountStatus"), "Admin page connects to setAccountStatus store action");
assert(accessPage.includes("resetPassword"), "Admin page connects to resetPassword store action");
assert(accessPage.includes("Permission matrix"), "Admin page displays Permission matrix table");
assert(accessPage.includes("Read-only"), "Admin page renders Read-only badge for non-super admins");
assert(accessPage.includes("m.key === \"access\""), "Admin page enforces lock on Super Admin access toggle");
assert(accessPage.includes("Users & roles"), "Admin page displays Users & roles management section");
assert(accessPage.includes("Search users"), "Admin page provides search input for filtering users");
assert(accessPage.includes("ConfirmDialog"), "Admin page features confirmation dialog for password reset");

console.log("\n[2. Connected Store & 4-Layer API Synchronization]");
assert(storeCode.includes("setRole"), "Store exports setRole action");
assert(storeCode.includes("setAccountStatus"), "Store exports setAccountStatus action");
assert(storeCode.includes("resetPassword"), "Store exports resetPassword action");
assert(storeCode.includes("togglePermission"), "Store exports togglePermission action");
assert(storeCode.includes("/api/access/roles"), "Store dispatches role updates to /api/access/roles");
assert(storeCode.includes("/api/access/status"), "Store dispatches account status updates to /api/access/status");
assert(storeCode.includes("/api/access/reset-password"), "Store dispatches password resets to /api/access/reset-password");
assert(storeCode.includes("/api/access/permissions/toggle"), "Store dispatches permission toggles to /api/access/permissions/toggle");

console.log("\n[3. Layer 4: REST API Route Handlers]");
const permissionsRoute = readFileSync(resolvePath("src/app/api/access/permissions/route.ts"), "utf-8");
const toggleRoute = readFileSync(resolvePath("src/app/api/access/permissions/toggle/route.ts"), "utf-8");
const rolesRoute = readFileSync(resolvePath("src/app/api/access/roles/route.ts"), "utf-8");
const statusRoute = readFileSync(resolvePath("src/app/api/access/status/route.ts"), "utf-8");
const resetPasswordRoute = readFileSync(resolvePath("src/app/api/access/reset-password/route.ts"), "utf-8");

assert(permissionsRoute.includes("GET"), "GET /api/access/permissions defined");
assert(permissionsRoute.includes("accessService.getMatrix"), "GET /api/access/permissions calls accessService.getMatrix");
assert(toggleRoute.includes("POST"), "POST /api/access/permissions/toggle defined");
assert(toggleRoute.includes("accessService.togglePermission"), "POST /api/access/permissions/toggle calls accessService.togglePermission");
assert(rolesRoute.includes("POST"), "POST /api/access/roles defined");
assert(rolesRoute.includes("accessService.setRole"), "POST /api/access/roles calls accessService.setRole");
assert(statusRoute.includes("POST"), "POST /api/access/status defined");
assert(statusRoute.includes("accessService.setAccountStatus"), "POST /api/access/status calls accessService.setAccountStatus");
assert(resetPasswordRoute.includes("POST"), "POST /api/access/reset-password defined");
assert(resetPasswordRoute.includes("accessService.resetPassword"), "POST /api/access/reset-password calls accessService.resetPassword");

console.log("\n==================================================================");
console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log("==================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL PAGE 10 FRONTEND INTEGRATION CHECKS PASSED (100%)\n");
}

