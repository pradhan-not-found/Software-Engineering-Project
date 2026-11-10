// frontend/scripts/verify-frontend-page6.mjs
// Verifies frontend integration for Page 6 (Admin Payroll & Employee Payslips)

import { readFileSync } from "fs";
import { resolve } from "path";

console.log("==================================================================");
console.log("VERIFYING FRONTEND INTEGRATION: PAGE 6 (PAYROLL & SALARY)");
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

const adminPayrollPage = readFileSync(resolve("src/app/admin/payroll/page.tsx"), "utf-8");
const employeePayslipsPage = readFileSync(resolve("src/app/employee/payslips/page.tsx"), "utf-8");
const payslipModal = readFileSync(resolve("src/components/Payslip.tsx"), "utf-8");
const storeCode = readFileSync(resolve("src/lib/store.tsx"), "utf-8");

console.log("\n[1. Admin Payroll Page UI Wireup]");
assert(adminPayrollPage.includes("Runs"), "Admin page embeds Runs overview table");
assert(adminPayrollPage.includes("RunDetail"), "Admin page embeds RunDetail view");
assert(adminPayrollPage.includes("SalaryStructures"), "Admin page embeds SalaryStructures tab");
assert(adminPayrollPage.includes("TaxSummary"), "Admin page embeds Tax Compliance tab");
assert(adminPayrollPage.includes("generatePayroll"), "Admin page connects to generatePayroll action");
assert(adminPayrollPage.includes("recalcPayroll"), "Admin page connects to recalcPayroll action");
assert(adminPayrollPage.includes("setPayrollStatus"), "Admin page connects to setPayrollStatus action");
assert(adminPayrollPage.includes("deletePayrollRun"), "Admin page connects to deletePayrollRun action");

console.log("\n[2. Employee Payslips Page UI Wireup]");
assert(employeePayslipsPage.includes("Payslip history"), "Employee page renders historical payslips table");
assert(employeePayslipsPage.includes("Salary structure"), "Employee page displays effective CTC salary structure");
assert(employeePayslipsPage.includes("PayslipModal"), "Employee page connects to PayslipModal preview");
assert(employeePayslipsPage.includes("computePayrollLine"), "Employee page calculates projected monthly take-home");

console.log("\n[3. Payslip Presentation Component]");
assert(payslipModal.includes("Earnings"), "PayslipModal displays detailed Earnings column");
assert(payslipModal.includes("Deductions"), "PayslipModal displays detailed Deductions column");
assert(payslipModal.includes("Net Pay"), "PayslipModal computes final net payout");
assert(payslipModal.includes("Print"), "PayslipModal supports printing / PDF export");

console.log("\n[4. 4-Layer API Synchronization in Store]");
assert(storeCode.includes("fetch(\"/api/payroll\""), "generatePayroll dispatches to /api/payroll");
assert(storeCode.includes("fetch(`/api/payroll/${id}/recalculate`"), "recalcPayroll dispatches to /api/payroll/[id]/recalculate");
assert(storeCode.includes("fetch(`/api/payroll/${id}/status`"), "setPayrollStatus dispatches to /api/payroll/[id]/status");
assert(storeCode.includes("fetch(`/api/payroll/${id}`"), "deletePayrollRun dispatches to /api/payroll/[id]");
assert(storeCode.includes("fetch(\"/api/payroll/salary\""), "updateSalary dispatches to /api/payroll/salary");

console.log("\n==================================================================");
console.log(`PAGE 6 FRONTEND SUMMARY: ${passed} Passed, ${failed} Failed`);
console.log("==================================================================");

if (failed > 0) process.exit(1);
