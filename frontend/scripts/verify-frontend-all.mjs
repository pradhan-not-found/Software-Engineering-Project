// frontend/scripts/verify-frontend-all.mjs
// Master test runner for all frontend feature domains

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const suites = [
  { name: "Frontend Page 2: Company Directory & Onboarding", script: "verify-frontend-page2.mjs" },
  { name: "Frontend Page 3: Leaves & Delays UI", script: "verify-frontend-page3.mjs" },
  { name: "Frontend Page 4: Projects & Kanban Boards", script: "verify-frontend-page4.mjs" },
  { name: "Frontend Page 5: Attendance & Timesheets", script: "verify-frontend-page5.mjs" },
  { name: "Frontend Page 6: Payroll & Payslips", script: "verify-frontend-page6.mjs" },
  { name: "Frontend Page 7: Admin Overview Dashboard", script: "verify-frontend-page7.mjs" },
  { name: "Frontend Page 8: Expenses & Reimbursements", script: "verify-frontend-page8.mjs" },
  { name: "Frontend Page 9: Performance Management & Reviews", script: "verify-frontend-page9.mjs" },
  { name: "Frontend Page 10: Access Control & Role-Based Permissions", script: "verify-frontend-page10.mjs" },
  { name: "Frontend Page 11: Reports & Executive Analytics Engine", script: "verify-frontend-page11.mjs" },
  { name: "Frontend Page 12: Organization Settings, Workspaces & Holiday Calendar", script: "verify-frontend-page12.mjs" },
  { name: "Frontend Page 13: Notifications Center & Organization Activity Feed", script: "verify-frontend-page13.mjs" },
];

console.log("================================================================================");
console.log("         WORKPLACE EMS - MASTER FRONTEND VERIFICATION SUITE                    ");
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
    cwd: path.resolve(__dirname, ".."),
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
console.log("                        FINAL FRONTEND TEST RESULTS                             ");
console.log("================================================================================");
console.log(`  Total Suites Executed : ${suites.length}`);
console.log(`  Passed Suites         : ${totalPassedSuites}`);
console.log(`  Failed Suites         : ${totalFailedSuites}`);
console.log(`  Status                : ${totalFailedSuites === 0 ? `ALL ${totalPassedSuites} FRONTEND SUITES PASSED (100%)` : "FAILURES ENCOUNTERED"}`);
console.log("================================================================================\n");

if (totalFailedSuites > 0) {
  process.exit(1);
}

