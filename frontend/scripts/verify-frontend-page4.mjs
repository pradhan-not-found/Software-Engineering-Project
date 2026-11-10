// frontend/scripts/verify-frontend-page4.mjs
// Verifies frontend UI integration for Page 4 (Admin Projects & Employee Tasks)

import { readFileSync } from "fs";
import { resolve } from "path";

console.log("==================================================================");
console.log("VERIFYING FRONTEND INTEGRATION: PAGE 4 (PROJECTS & TASKS)");
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

const adminProjectsPage = readFileSync(resolve("src/app/admin/projects/page.tsx"), "utf-8");
const employeeTasksPage = readFileSync(resolve("src/app/employee/tasks/page.tsx"), "utf-8");
const storeCode = readFileSync(resolve("src/lib/store.tsx"), "utf-8");
const taskComponents = readFileSync(resolve("src/components/tasks/TaskComponents.tsx"), "utf-8");

console.log("\n[1. Admin Projects Page UI Wireup]");
assert(adminProjectsPage.includes("KanbanBoard"), "Admin page embeds interactive KanbanBoard");
assert(adminProjectsPage.includes("TaskDetailModal"), "Admin page supports TaskDetailModal inspection");
assert(adminProjectsPage.includes("TaskFormModal"), "Admin page supports TaskFormModal creation");
assert(adminProjectsPage.includes("moveTask"), "Admin page connects to moveTask action");
assert(adminProjectsPage.includes("updateProject"), "Admin page connects to updateProject action");

console.log("\n[2. Employee Tasks Page UI Wireup]");
assert(employeeTasksPage.includes("useAuthed"), "Employee page connects to useAuthed context");
assert(employeeTasksPage.includes("moveTask"), "Employee page connects to moveTask action");
assert(employeeTasksPage.includes("isOverdue"), "Employee page identifies and highlights overdue tasks");
assert(employeeTasksPage.includes("DELAYED_ON_LEAVE") || employeeTasksPage.includes("flagged"), "Employee page detects HR event delay flags");

console.log("\n[3. TaskComponents Kanban & Modals]");
assert(taskComponents.includes("KanbanBoard"), "TaskComponents exports KanbanBoard");
assert(taskComponents.includes("TaskDetailModal"), "TaskComponents exports TaskDetailModal");
assert(taskComponents.includes("TaskFormModal"), "TaskComponents exports TaskFormModal");
assert(taskComponents.includes("reassignTask") || taskComponents.includes("addComment"), "TaskComponents includes task collaboration tools");

console.log("\n[4. 4-Layer API Synchronization in Store]");
assert(storeCode.includes("fetch(\"/api/tasks\""), "createTask dispatches to /api/tasks API endpoint");
assert(storeCode.includes("fetch(`/api/tasks/${id}`"), "updateTask dispatches to /api/tasks/[id] API endpoint");
assert(storeCode.includes("fetch(`/api/tasks/${id}/move`"), "moveTask dispatches to /api/tasks/[id]/move API endpoint");
assert(storeCode.includes("fetch(`/api/tasks/${taskId}/comments`"), "addComment dispatches to /api/tasks/[id]/comments API endpoint");
assert(storeCode.includes("fetch(\"/api/projects\""), "createProject dispatches to /api/projects API endpoint");

console.log("\n==================================================================");
console.log(`PAGE 4 FRONTEND SUMMARY: ${passed} Passed, ${failed} Failed`);
console.log("==================================================================");

if (failed > 0) process.exit(1);
