// frontend/scripts/verify-frontend-page13.mjs
// Verifies frontend integration for Page 13 (Notifications Center & Organization Activity Feed)

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

console.log("==================================================================");
console.log("VERIFYING FRONTEND INTEGRATION: PAGE 13 (NOTIFICATIONS & ACTIVITY)");
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

const adminPage = readFileSync(resolvePath("src/app/admin/notifications/page.tsx"), "utf-8");
const employeePage = readFileSync(resolvePath("src/app/employee/notifications/page.tsx"), "utf-8");
const centerComponent = readFileSync(resolvePath("src/components/NotificationsCenter.tsx"), "utf-8");
const storeCode = readFileSync(resolvePath("src/lib/store.tsx"), "utf-8");

console.log("\n[1. Page Wireup & Component Architecture]");
assert(adminPage.includes('NotificationsCenter variant="admin"'), "Admin page embeds NotificationsCenter with admin variant");
assert(employeePage.includes('NotificationsCenter variant="employee"'), "Employee page embeds NotificationsCenter with employee variant");
assert(centerComponent.includes("fetchNotifications"), "NotificationsCenter connects to fetchNotifications");
assert(centerComponent.includes("fetchAuditLog"), "NotificationsCenter connects to fetchAuditLog");
assert(centerComponent.includes("markRead"), "NotificationsCenter connects to markRead");
assert(centerComponent.includes("markAllRead"), "NotificationsCenter connects to markAllRead");
assert(centerComponent.includes("clearNotifications"), "NotificationsCenter connects to clearNotifications");
assert(centerComponent.includes("exportAudit"), "NotificationsCenter wires audit CSV export");

console.log("\n[2. Connected Store & 4-Layer API Synchronization]");
assert(storeCode.includes("fetchNotifications"), "Store exports fetchNotifications action");
assert(storeCode.includes("fetchAuditLog"), "Store exports fetchAuditLog action");
assert(storeCode.includes("/api/notifications"), "Store dispatches requests to /api/notifications");
assert(storeCode.includes("/api/notifications/mark-all-read"), "Store dispatches requests to /api/notifications/mark-all-read");
assert(storeCode.includes("/api/notifications/clear"), "Store dispatches requests to /api/notifications/clear");
assert(storeCode.includes("/api/activity"), "Store dispatches requests to /api/activity");

console.log("\n[3. Layer 4: REST API Route Handlers]");
const notifsRoute = readFileSync(resolvePath("src/app/api/notifications/route.ts"), "utf-8");
const readRoute = readFileSync(resolvePath("src/app/api/notifications/[id]/read/route.ts"), "utf-8");
const markAllRoute = readFileSync(resolvePath("src/app/api/notifications/mark-all-read/route.ts"), "utf-8");
const clearRoute = readFileSync(resolvePath("src/app/api/notifications/clear/route.ts"), "utf-8");
const activityRoute = readFileSync(resolvePath("src/app/api/activity/route.ts"), "utf-8");
const exportRoute = readFileSync(resolvePath("src/app/api/activity/export/route.ts"), "utf-8");

assert(notifsRoute.includes("GET") && notifsRoute.includes("notificationService.getInbox"), "GET /api/notifications calls notificationService.getInbox");
assert(notifsRoute.includes("POST") && notifsRoute.includes("notificationService.sendNotification"), "POST /api/notifications calls notificationService.sendNotification");
assert(readRoute.includes("PATCH") && readRoute.includes("notificationService.markNotificationRead"), "PATCH /api/notifications/[id]/read calls notificationService.markNotificationRead");
assert(markAllRoute.includes("POST") && markAllRoute.includes("notificationService.markAllNotificationsRead"), "POST /api/notifications/mark-all-read calls notificationService.markAllNotificationsRead");
assert(clearRoute.includes("DELETE") && clearRoute.includes("notificationService.clearUserNotifications"), "DELETE /api/notifications/clear calls notificationService.clearUserNotifications");
assert(activityRoute.includes("GET") && activityRoute.includes("notificationService.getAuditLog"), "GET /api/activity calls notificationService.getAuditLog");
assert(activityRoute.includes("POST") && activityRoute.includes("notificationService.logActivity"), "POST /api/activity calls notificationService.logActivity");
assert(exportRoute.includes("GET") && exportRoute.includes("notificationService.exportAuditCSV"), "GET /api/activity/export calls notificationService.exportAuditCSV");

console.log("\n==================================================================");
console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log("==================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL PAGE 13 FRONTEND INTEGRATION CHECKS PASSED (100%)\n");
}
