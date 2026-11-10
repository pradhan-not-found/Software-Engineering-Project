// backend/scripts/verify-all.mjs
// Master test runner for the dedicated Workplace EMS Backend

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const suites = [
  { name: "Page 1: Authentication & Session Gateway", script: "verify-page1.mjs" },
  { name: "Page 2: Company Directory & Atomic Onboarding Engine", script: "verify-page2.mjs" },
  { name: "Page 3: Leave Management & Task Delay Flagging", script: "verify-page3.mjs" },
  { name: "Page 4: Projects, Kanban Boards & Recurrence Engine", script: "verify-page4.mjs" },
  { name: "Page 4 (Advanced): Connected Work Management & DND Verification", script: "verify-full-page4-features.mjs" },
  { name: "Page 5: Attendance, Timesheets & Shift Policy Enforcement", script: "verify-page5.mjs" },
  { name: "Page 6: Payroll, Salary Structures & Loss of Pay (LOP) Engine", script: "verify-page6.mjs" },
  { name: "Page 7: Admin Overview Dashboard & Executive Analytics", script: "verify-page7.mjs" },
];

console.log("================================================================================");
console.log("         WORKPLACE EMS - MASTER BACKEND VERIFICATION SUITE                     ");
console.log("================================================================================");

let totalPassedSuites = 0;
let totalFailedSuites = 0;

for (const suite of suites) {
  const scriptPath = path.join(__dirname, suite.script);
  console.log(`\n▶ RUNNING SUITE: ${suite.name}`);
  console.log(`  Target: ${suite.script}`);
  console.log("--------------------------------------------------------------------------------");

  const result = spawnSync("node", [scriptPath], {
    stdio: "inherit",
    env: process.env,
  });

  if (result.status === 0) {
    totalPassedSuites++;
    console.log(`✔ SUITE COMPLETED: ${suite.name} (PASSED)`);
  } else {
    totalFailedSuites++;
    console.error(`✖ SUITE FAILED: ${suite.name} (Exit code ${result.status})`);
  }
}

console.log("\n================================================================================");
console.log("                        FINAL BACKEND TEST RESULTS                              ");
console.log("================================================================================");
console.log(`  Total Suites Executed : ${suites.length}`);
console.log(`  Passed Suites         : ${totalPassedSuites}`);
console.log(`  Failed Suites         : ${totalFailedSuites}`);
console.log(`  Status                : ${totalFailedSuites === 0 ? "ALL 8 BACKEND SUITES PASSED (100%)" : "FAILURES ENCOUNTERED"}`);
console.log("================================================================================\n");

if (totalFailedSuites > 0) {
  process.exit(1);
}

