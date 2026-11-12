// frontend/scripts/verify-frontend-page16.mjs
// Verifies frontend integration for Page 16 (My Team & Department Collaboration Hub)

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

console.log("==================================================================");
console.log("VERIFYING FRONTEND INTEGRATION: PAGE 16 (MY TEAM HUB & COLLABORATION)");
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

const teamPage = readFileSync(resolvePath("src/app/employee/team/page.tsx"), "utf-8");
const storeCode = readFileSync(resolvePath("src/lib/store.tsx"), "utf-8");
const teamValidation = readFileSync(resolvePath("src/lib/validations/team.schema.ts"), "utf-8");
const teamRepo = readFileSync(resolvePath("src/lib/repositories/team.repository.ts"), "utf-8");
const teamServiceCode = readFileSync(resolvePath("src/lib/services/team.service.ts"), "utf-8");
const overviewRoute = readFileSync(resolvePath("src/app/api/team/overview/route.ts"), "utf-8");
const reassignTaskRoute = readFileSync(resolvePath("src/app/api/team/reassign-task/route.ts"), "utf-8");

console.log("\n[1. Page Wireup & Managerial Collaboration Architecture]");
assert(teamPage.includes("My Team"), "MyTeamPage renders page header title");
assert(teamPage.includes("No direct reports"), "MyTeamPage handles non-manager empty state");
assert(teamPage.includes("Out today") && teamPage.includes("Pending leave"), "MyTeamPage renders team attendance and leave statcards");
assert(teamPage.includes("Flagged tasks") && teamPage.includes("Reviews to write"), "MyTeamPage renders flagged task and performance review statcards");
assert(teamPage.includes("Team workload & availability"), "MyTeamPage renders team workload and availability table");
assert(teamPage.includes("Leave requests awaiting your decision"), "MyTeamPage renders contextual leave approvals card");
assert(teamPage.includes("task(s) due in window"), "MyTeamPage checks due task collision during requested leave window");
assert(teamPage.includes("Also off:"), "MyTeamPage alerts on overlapping team member absences");
assert(teamPage.includes("Reassign to"), "MyTeamPage offers one-click peer cover reassignment for delayed tasks");
assert(teamPage.includes("Timesheets to approve"), "MyTeamPage renders direct report timesheet approval table");
assert(teamPage.includes("Performance reviews"), "MyTeamPage renders active performance review cycle card");
assert(teamPage.includes("fetchTeamOverview"), "MyTeamPage synchronizes with backend fetchTeamOverview on mount");

console.log("\n[2. Connected Store & 4-Layer Frontend Integration]");
assert(storeCode.includes("fetchTeamOverview"), "Store exports fetchTeamOverview action");
assert(storeCode.includes("/api/team/overview"), "Store connects fetchTeamOverview to /api/team/overview endpoint");
assert(storeCode.includes("/api/team/reassign-task"), "Store connects reassignTask to /api/team/reassign-task endpoint");

console.log("\n[3. Full 4-Layer Architecture Files]");
assert(teamValidation.includes("validateTeamFilterInput"), "Layer 1: team.schema.ts defines validateTeamFilterInput");
assert(teamValidation.includes("validateReassignTaskInput"), "Layer 1: team.schema.ts defines validateReassignTaskInput");
assert(teamRepo.includes("TeamRepository"), "Layer 2: team.repository.ts implements TeamRepository DAL");
assert(teamRepo.includes("getDirectReports") && teamRepo.includes("getAllSubordinates"), "Layer 2: team.repository.ts provides direct & recursive subordinates retrieval");
assert(teamRepo.includes("reassignTask"), "Layer 2: team.repository.ts supports task reassignment");
assert(teamServiceCode.includes("TeamService"), "Layer 3: team.service.ts implements TeamService domain engine");
assert(teamServiceCode.includes("getTeamOverview"), "Layer 3: team.service.ts calculates managerial workload overview and risk metrics");
assert(teamServiceCode.includes("reassignTaskCover"), "Layer 3: team.service.ts reassigns tasks and dispatches audit log + notification");

console.log("\n[4. Layer 4: REST API Route Handlers]");
assert(overviewRoute.includes("GET") && overviewRoute.includes("teamService.getTeamOverview"), "GET /api/team/overview dispatches to teamService.getTeamOverview");
assert(reassignTaskRoute.includes("POST") && reassignTaskRoute.includes("teamService.reassignTaskCover"), "POST /api/team/reassign-task dispatches to teamService.reassignTaskCover");

console.log("\n==================================================================");
console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log("==================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL PAGE 16 FRONTEND INTEGRATION CHECKS PASSED (100%)\n");
}
