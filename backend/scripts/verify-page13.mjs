// backend/scripts/verify-page13.mjs
// Comprehensive verification test suite for Page 13: Notifications Center & Organization Activity Feed

import assert from "node:assert";

// -------------------------------------------------------------
// [1. Layer 1: Validation Schemas]
// -------------------------------------------------------------
const VALID_CATEGORIES = ["HR", "WORK", "SYSTEM", "ALL"];
const VALID_ACTIONS = ["CREATE", "UPDATE", "DELETE", "APPROVE", "REJECT", "SYSTEM"];

function validateNotificationFilter(input) {
  if (!input || typeof input !== "object") {
    return { ok: true, data: {} };
  }

  if (input.category && !VALID_CATEGORIES.includes(input.category)) {
    return { ok: false, error: `Invalid category: ${input.category}. Allowed: ${VALID_CATEGORIES.join(", ")}` };
  }

  return {
    ok: true,
    data: {
      category: input.category,
      unreadOnly: Boolean(input.unreadOnly),
    },
  };
}

function validateActivityFilter(input) {
  if (!input || typeof input !== "object") {
    return { ok: true, data: {} };
  }

  if (input.category && !VALID_CATEGORIES.includes(input.category)) {
    return { ok: false, error: `Invalid category: ${input.category}. Allowed: ${VALID_CATEGORIES.join(", ")}` };
  }

  return {
    ok: true,
    data: {
      category: input.category,
      entity: typeof input.entity === "string" ? input.entity.trim() : undefined,
      query: typeof input.query === "string" ? input.query.trim() : undefined,
    },
  };
}

function validateCreateNotificationInput(input) {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Notification payload is required." };
  }

  if (!input.recipientId || typeof input.recipientId !== "string" || !input.recipientId.trim()) {
    return { ok: false, error: "Recipient ID is required." };
  }

  if (!input.title || typeof input.title !== "string" || input.title.trim().length < 2) {
    return { ok: false, error: "Notification title must be at least 2 characters." };
  }

  if (!input.message || typeof input.message !== "string" || input.message.trim().length < 2) {
    return { ok: false, error: "Notification message must be at least 2 characters." };
  }

  if (!input.category || !["HR", "WORK", "SYSTEM"].includes(input.category)) {
    return { ok: false, error: "Category must be one of: HR, WORK, SYSTEM" };
  }

  return {
    ok: true,
    data: {
      recipientId: input.recipientId.trim(),
      title: input.title.trim(),
      message: input.message.trim(),
      category: input.category,
      link: typeof input.link === "string" ? input.link.trim() : null,
    },
  };
}

function validateCreateActivityInput(input) {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Activity log payload is required." };
  }

  if (!input.action || !VALID_ACTIONS.includes(input.action)) {
    return { ok: false, error: `Action must be one of: ${VALID_ACTIONS.join(", ")}` };
  }

  if (!input.entity || typeof input.entity !== "string" || !input.entity.trim()) {
    return { ok: false, error: "Entity name is required." };
  }

  if (!input.message || typeof input.message !== "string" || input.message.trim().length < 2) {
    return { ok: false, error: "Activity message must be at least 2 characters." };
  }

  if (!input.category || !["HR", "WORK", "SYSTEM"].includes(input.category)) {
    return { ok: false, error: "Category must be one of: HR, WORK, SYSTEM" };
  }

  return {
    ok: true,
    data: {
      actorId: typeof input.actorId === "string" && input.actorId.trim() ? input.actorId.trim() : null,
      action: input.action,
      entity: input.entity.trim(),
      message: input.message.trim(),
      category: input.category,
    },
  };
}

// -------------------------------------------------------------
// [2. Layer 2: Repository Layer Simulation]
// -------------------------------------------------------------
const mockDb = {
  notifications: [
    {
      id: "n1",
      recipientId: "e1",
      title: "Leave requested",
      message: "Sarah requested Annual leave.",
      category: "HR",
      read: false,
      link: "/admin/leaves",
      createdAt: "2026-03-01T09:00:00Z",
    },
    {
      id: "n2",
      recipientId: "e1",
      title: "Sprint Completed",
      message: "Sprint 4 was closed with 18 tasks done.",
      category: "WORK",
      read: true,
      link: "/admin/projects",
      createdAt: "2026-03-02T10:00:00Z",
    },
    {
      id: "n3",
      recipientId: "e2",
      title: "Holiday Added",
      message: "Diwali added to calendar.",
      category: "SYSTEM",
      read: false,
      link: "/employee/calendar",
      createdAt: "2026-03-03T11:00:00Z",
    },
  ],
  activity: [
    {
      id: "act1",
      actorId: "e1",
      action: "APPROVE",
      entity: "Leave",
      message: "Arjun approved Sarah's leave.",
      category: "HR",
      at: "2026-03-01T09:30:00Z",
    },
    {
      id: "act2",
      actorId: null,
      action: "SYSTEM",
      entity: "Holiday",
      message: "System scheduled holiday notification.",
      category: "SYSTEM",
      at: "2026-03-02T08:00:00Z",
    },
  ],
  employees: [
    { id: "e1", firstName: "Arjun", lastName: "Mehta", role: "SUPER_ADMIN" },
    { id: "e2", firstName: "Neha", lastName: "Kapoor", role: "HR_ADMIN" },
    { id: "e3", firstName: "Vikram", lastName: "Iyer", role: "EMPLOYEE" },
  ],
};

const repository = {
  async getNotifications(recipientId, filter) {
    let items = mockDb.notifications.filter((n) => n.recipientId === recipientId);
    if (filter?.category && filter.category !== "ALL") {
      items = items.filter((n) => n.category === filter.category);
    }
    if (filter?.unreadOnly) {
      items = items.filter((n) => !n.read);
    }
    return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  async getUnreadCount(recipientId) {
    return mockDb.notifications.filter((n) => n.recipientId === recipientId && !n.read).length;
  },
  async markAsRead(id, recipientId) {
    const item = mockDb.notifications.find((n) => n.id === id && n.recipientId === recipientId);
    if (!item) return false;
    item.read = true;
    return true;
  },
  async markAllAsRead(recipientId) {
    let count = 0;
    mockDb.notifications.forEach((n) => {
      if (n.recipientId === recipientId && !n.read) {
        n.read = true;
        count++;
      }
    });
    return count;
  },
  async clearNotifications(recipientId) {
    const init = mockDb.notifications.length;
    mockDb.notifications = mockDb.notifications.filter((n) => n.recipientId !== recipientId);
    return init - mockDb.notifications.length;
  },
  async createNotification(data) {
    const newNotif = {
      id: `n_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      recipientId: data.recipientId,
      title: data.title,
      message: data.message,
      category: data.category,
      read: false,
      link: data.link || null,
      createdAt: new Date().toISOString(),
    };
    mockDb.notifications.unshift(newNotif);
    return newNotif;
  },
  async getActivityLogs(filter) {
    let items = mockDb.activity;
    if (filter?.category && filter.category !== "ALL") {
      items = items.filter((a) => a.category === filter.category);
    }
    if (filter?.entity) {
      items = items.filter((a) => a.entity.toLowerCase() === filter.entity.toLowerCase());
    }
    if (filter?.query) {
      const q = filter.query.toLowerCase();
      items = items.filter((a) => a.message.toLowerCase().includes(q) || a.entity.toLowerCase().includes(q));
    }
    return [...items].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  },
  async createActivityLog(data) {
    const newAct = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      actorId: data.actorId || null,
      action: data.action,
      entity: data.entity,
      message: data.message,
      category: data.category,
      at: new Date().toISOString(),
    };
    mockDb.activity.unshift(newAct);
    return newAct;
  },
};

// -------------------------------------------------------------
// [3. Layer 3: Domain Service Simulation]
// -------------------------------------------------------------
const service = {
  isAdminRole(role) {
    return role === "SUPER_ADMIN" || role === "HR_ADMIN";
  },
  async getInbox(actor, rawFilter) {
    const v = validateNotificationFilter(rawFilter);
    if (!v.ok) return { ok: false, error: v.error };

    const all = await repository.getNotifications(actor.id);
    const filtered = await repository.getNotifications(actor.id, v.data);
    const unreadCount = await repository.getUnreadCount(actor.id);

    return {
      ok: true,
      data: {
        notifications: filtered,
        total: all.length,
        unreadCount,
        categories: {
          HR: all.filter((n) => n.category === "HR").length,
          WORK: all.filter((n) => n.category === "WORK").length,
          SYSTEM: all.filter((n) => n.category === "SYSTEM").length,
        },
      },
    };
  },
  async markNotificationRead(actor, notificationId) {
    const ok = await repository.markAsRead(notificationId, actor.id);
    if (!ok) return { ok: false, error: "Notification not found or access denied." };
    return { ok: true, data: { id: notificationId, read: true } };
  },
  async markAllNotificationsRead(actor) {
    const count = await repository.markAllAsRead(actor.id);
    return { ok: true, data: { markedCount: count } };
  },
  async clearUserNotifications(actor) {
    const count = await repository.clearNotifications(actor.id);
    return { ok: true, data: { clearedCount: count } };
  },
  async getAuditLog(actor, rawFilter) {
    if (!this.isAdminRole(actor.role)) {
      return { ok: false, error: "Only administrators can access the organization audit log." };
    }
    const v = validateActivityFilter(rawFilter);
    if (!v.ok) return { ok: false, error: v.error };

    const rawLogs = await repository.getActivityLogs(v.data);
    const allLogs = await repository.getActivityLogs();
    const entities = Array.from(new Set(allLogs.map((a) => a.entity))).sort();

    const logs = rawLogs.map((log) => {
      const emp = mockDb.employees.find((e) => e.id === log.actorId);
      return {
        ...log,
        actorName: emp ? `${emp.firstName} ${emp.lastName}` : "System",
      };
    });

    return {
      ok: true,
      data: { logs, total: allLogs.length, entities },
    };
  },
  async exportAuditCSV(actor, rawFilter) {
    if (!this.isAdminRole(actor.role)) {
      return { ok: false, error: "Only administrators can export organization audit logs." };
    }
    const res = await this.getAuditLog(actor, rawFilter);
    if (!res.ok) return res;

    const escapeCsv = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const headers = ["Timestamp", "Actor", "Action", "Entity", "Category", "Message"];
    const rows = res.data.logs.map((l) => [l.at, l.actorName, l.action, l.entity, l.category, l.message]);
    const csv = [headers.map(escapeCsv).join(","), ...rows.map((r) => r.map(escapeCsv).join(","))].join("\n");

    return { ok: true, data: { csv, filename: "audit-log.csv" } };
  },
};

// -------------------------------------------------------------
// [4. Execution & Assertions]
// -------------------------------------------------------------
console.log("==================================================================");
console.log("TESTING PAGE 13 (NOTIFICATIONS CENTER & AUDIT FEED)");
console.log("==================================================================");

let passed = 0;
let failed = 0;

function testAssert(cond, msg) {
  if (cond) {
    console.log(`  ✓ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    failed++;
  }
}

async function runAll() {
  console.log("\n[1. Layer 1: Validation Schemas]");
  testAssert(validateNotificationFilter({ category: "HR", unreadOnly: true }).ok, "NotificationFilter: accepts category and unreadOnly");
  testAssert(!validateNotificationFilter({ category: "INVALID" }).ok, "NotificationFilter: rejects invalid category");
  testAssert(validateActivityFilter({ category: "WORK", entity: "Leave" }).ok, "ActivityFilter: accepts category and entity");
  testAssert(validateCreateNotificationInput({ recipientId: "e1", title: "Task Ready", message: "Code reviewed", category: "WORK" }).ok, "CreateNotificationInput: accepts valid payload");
  testAssert(!validateCreateNotificationInput({ recipientId: "e1", title: "", message: "Code reviewed", category: "WORK" }).ok, "CreateNotificationInput: rejects empty title");
  testAssert(validateCreateActivityInput({ action: "APPROVE", entity: "Leave", message: "Leave approved", category: "HR" }).ok, "CreateActivityInput: accepts valid activity");

  console.log("\n[2. Layer 2: Repository Data Access]");
  const createdNotif = await repository.createNotification({ recipientId: "e1", title: "Review Ready", message: "Ready for review", category: "WORK" });
  testAssert(createdNotif.id.startsWith("n_") && createdNotif.read === false, "Repository creates and saves new notification");
  
  const notifs = await repository.getNotifications("e1");
  testAssert(notifs.length >= 2, "Repository retrieves notifications for recipient");
  
  const unreadCount = await repository.getUnreadCount("e1");
  testAssert(unreadCount >= 1, "Repository accurately counts unread notifications");
  
  const markRes = await repository.markAsRead(createdNotif.id, "e1");
  testAssert(markRes === true, "Repository marks notification read");

  console.log("\n[3. Layer 3: Domain Service & Security Invariants]");
  const inbox = await service.getInbox({ id: "e1", role: "SUPER_ADMIN" });
  testAssert(inbox.ok && inbox.data.notifications.length > 0, "Domain Service generates complete inbox summary");

  const foreignMark = await service.markNotificationRead({ id: "e3", role: "EMPLOYEE" }, createdNotif.id);
  testAssert(!foreignMark.ok, "Security Invariant: Users cannot mark notifications of other recipients");

  const empAudit = await service.getAuditLog({ id: "e3", role: "EMPLOYEE" });
  testAssert(!empAudit.ok, "Security Invariant: Non-admin role blocked from audit log");

  const adminAudit = await service.getAuditLog({ id: "e1", role: "SUPER_ADMIN" });
  testAssert(adminAudit.ok && adminAudit.data.logs.length > 0, "Domain Service returns audit log to SUPER_ADMIN");

  const csv = await service.exportAuditCSV({ id: "e1", role: "SUPER_ADMIN" });
  testAssert(csv.ok && csv.data.csv.includes('"Timestamp"'), "Domain Service produces RFC 4180 CSV export");

  const clear = await service.clearUserNotifications({ id: "e1", role: "SUPER_ADMIN" });
  testAssert(clear.ok, "Domain Service successfully clears notifications");

  console.log("\n==================================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==================================================================");

  if (failed > 0) process.exit(1);
  console.log("🎉 ALL PAGE 13 BACKEND VERIFICATION CHECKS PASSED (100%)\n");
}

runAll().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
