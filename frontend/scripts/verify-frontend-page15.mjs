// frontend/scripts/verify-frontend-page15.mjs
// Verifies frontend integration for Page 15 (My Profile & Employee Self-Service)

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

console.log("==================================================================");
console.log("VERIFYING FRONTEND INTEGRATION: PAGE 15 (PROFILE & SELF-SERVICE)");
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

const profilePage = readFileSync(resolvePath("src/app/employee/profile/page.tsx"), "utf-8");
const storeCode = readFileSync(resolvePath("src/lib/store.tsx"), "utf-8");

console.log("\n[1. Employee Profile Page UI Wireup]");
assert(profilePage.includes("My Profile"), "Profile page renders My Profile title");
assert(profilePage.includes("fetchProfile"), "Profile page connects to fetchProfile action");
assert(profilePage.includes("updateEmployee"), "Profile page connects to updateEmployee for personal details");
assert(profilePage.includes("changePassword"), "Profile page connects to changePassword");
assert(profilePage.includes("addDocument"), "Profile page connects to addDocument upload");
assert(profilePage.includes("toggleOnboardingDoc"), "Profile page connects to toggleOnboardingDoc checklist");
assert(profilePage.includes("Personal information"), "Profile page renders Personal information card");
assert(profilePage.includes("Job information"), "Profile page renders Job information card");
assert(profilePage.includes("Documents"), "Profile page renders Documents card");
assert(profilePage.includes("Reporting line"), "Profile page renders Reporting line hierarchy card");
assert(profilePage.includes("Assigned assets"), "Profile page renders Assigned assets card");
assert(profilePage.includes("Change password"), "Profile page renders Change password card");

console.log("\n[2. Connected Store & 4-Layer API Synchronization]");
assert(storeCode.includes("fetchProfile"), "Store exports fetchProfile action");
assert(storeCode.includes("/api/profile/me"), "Store dispatches requests to /api/profile/me");
assert(storeCode.includes("/api/profile/password"), "Store dispatches requests to /api/profile/password");
assert(storeCode.includes("/api/profile/documents"), "Store dispatches requests to /api/profile/documents");
assert(storeCode.includes("/api/profile/onboarding-doc"), "Store dispatches requests to /api/profile/onboarding-doc");

console.log("\n[3. Layer 4: REST API Route Handlers]");
const meRoute = readFileSync(resolvePath("src/app/api/profile/me/route.ts"), "utf-8");
const passwordRoute = readFileSync(resolvePath("src/app/api/profile/password/route.ts"), "utf-8");
const docRoute = readFileSync(resolvePath("src/app/api/profile/documents/route.ts"), "utf-8");
const obDocRoute = readFileSync(resolvePath("src/app/api/profile/onboarding-doc/route.ts"), "utf-8");

assert(meRoute.includes("GET") && meRoute.includes("profileService.getProfile"), "GET /api/profile/me calls profileService.getProfile");
assert(meRoute.includes("PATCH") && meRoute.includes("profileService.updateProfile"), "PATCH /api/profile/me calls profileService.updateProfile");
assert(passwordRoute.includes("POST") && passwordRoute.includes("profileService.changePassword"), "POST /api/profile/password calls profileService.changePassword");
assert(docRoute.includes("POST") && docRoute.includes("profileService.uploadDocument"), "POST /api/profile/documents calls profileService.uploadDocument");
assert(obDocRoute.includes("POST") && obDocRoute.includes("profileService.toggleOnboardingDoc"), "POST /api/profile/onboarding-doc calls profileService.toggleOnboardingDoc");

console.log("\n==================================================================");
console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log("==================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL PAGE 15 FRONTEND INTEGRATION CHECKS PASSED (100%)\n");
}

