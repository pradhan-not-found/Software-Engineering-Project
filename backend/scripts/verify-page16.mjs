// backend/scripts/verify-page16.mjs
// Comprehensive verification test suite for Page 16: My Team & Department Collaboration Hub

import assert from "node:assert";

// -------------------------------------------------------------
// [1. Layer 1: Validation Schemas]
// -------------------------------------------------------------
function validateTeamFilterInput(input) {
  if (!input || typeof input !== "object") {
    return { ok: true, data: { includeIndirect: true } };
  }

  const result = {};

  if (input.date !== undefined && input.date !== null && input.date !== "") {
    const d = String(input.date).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      return { ok: false, error: "Date must be formatted YYYY-MM-DD." };
    }
    result.date = d;
  }

  result.includeIndirect = Boolean(input.includeIndirect ?? true);
  return { ok: true, data: result };
}

function validateReassignTaskInput(input) {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Reassignment payload is required." };
  }

  if (!input.taskId || typeof input.taskId !== "string" || !input.taskId.trim()) {
    return { ok: false, error: "Task ID is required." };
  }

  if (!input.fromEmployeeId || typeof input.fromEmployeeId !== "string" || !input.fromEmployeeId.trim()) {
    return { ok: false, error: "Current assignee ID is required." };
  }

  if (!input.toEmployeeId || typeof input.toEmployeeId !== "string" || !input.toEmployeeId.trim()) {
    return { ok: false, error: "Target assignee ID is required." };
  }

  if (input.fromEmployeeId.trim() === input.toEmployeeId.trim()) {
    return { ok: false, error: "Cannot reassign task to the same employee." };
  }

  return {
    ok: true,
    data: {
      taskId: input.taskId.trim(),
      fromEmployeeId: input.fromEmployeeId.trim(),
      toEmployeeId: input.toEmployeeId.trim(),
    },
  };
}

// -------------------------------------------------------------
// [2. Layer 2: Repository Data Access Simulation]
// -------------------------------------------------------------
const mockDb = {
  employees: [
    { id: "e1", code: "WP-1001", firstName: "Arjun", lastName: "Mehta", designation: "CEO", role: "SUPER_ADMIN", status: "ACTIVE", departmentId: "d_exec", managerId: null },
    { id: "e2", code: "WP-1002", firstName: "Neha", lastName: "Kapoor", designation: "HR Director", role: "HR_ADMIN", status: "ACTIVE", departmentId: "d_hr", managerId: "e1" },
    { id: "e3", code: "WP-1003", firstName: "Vikram", lastName: "Iyer", designation: "Engineering VP", role: "MANAGER", status: "ACTIVE", departmentId: "d_eng", managerId: "e1" },
    { id: "e4", code: "WP-1004", firstName: "Rahul", lastName: "Verma", designation: "Staff Engineer", role: "EMPLOYEE", status: "ACTIVE", departmentId: "d_eng", managerId: "e3" },
    { id: "e5", code: "WP-1005", firstName: "Sneha", lastName: "Roy", designation: "Junior Engineer", role: "EMPLOYEE", status: "ACTIVE", departmentId: "d_eng", managerId: "e3" },
    { id: "e6", code: "WP-1006", firstName: "Individual", lastName: "Contributor", designation: "Solo", role: "EMPLOYEE", status: "ACTIVE", departmentId: "d_eng", managerId: null },
  ],
  attendance: [
    { id: "att1", employeeId: "e4", date: "2026-11-12", status: "PRESENT" },
    { id: "att2", employeeId: "e5", date: "2026-11-12", status: "WFH" },
  ],
  leaves: [
    { id: "l1", employeeId: "e4", startDate: "2026-11-12", endDate: "2026-11-14", days: 3, type: "PAID", status: "APPROVED", reason: "Family event" },
    { id: "l2", employeeId: "e5", startDate: "2026-11-13", endDate: "2026-11-15", days: 3, type: "SICK", status: "PENDING", reason: "Flu" },
  ],
  tasks: [
    { id: "t1", title: "API Gateway Migration", assigneeIds: ["e4"], dueDate: "2026-11-13", flag: "DELAYED_ON_LEAVE", completedAt: null },
    { id: "t2", title: "Unit Testing Coverage", assigneeIds: ["e5"], dueDate: "2026-11-20", flag: "NORMAL", completedAt: null },
    { id: "t3", title: "Docs Refresh", assigneeIds: ["e4"], dueDate: "2026-11-05", flag: "NORMAL", completedAt: null }, // overdue
  ],
  timesheets: [
    { id: "ts1", employeeId: "e4", weekStart: "2026-11-02", status: "SUBMITTED", entries: [{ hours: [8, 8, 8, 8, 8] }] },
  ],
  cycles: [
    { id: "cyc1", name: "Q4 Performance Review", status: "ACTIVE", startDate: "2026-10-01", endDate: "2026-12-31" },
  ],
  reviews: [
    { id: "rev1", cycleId: "cyc1", employeeId: "e4", reviewerId: "e3", status: "PENDING", managerRating: null, managerComment: "" },
  ],
  activity: [],
  notifications: [],
};

class MockTeamRepository {
  async getDirectReports(managerId) {
    return mockDb.employees.filter((e) => e.managerId === managerId && e.status !== "TERMINATED");
  }

  async getAllSubordinates(managerId) {
    const subordinates = [];
    const queue = [managerId];
    const visited = new Set();

    while (queue.length > 0) {
      const cur = queue.shift();
      if (visited.has(cur)) continue;
      visited.add(cur);

      const direct = mockDb.employees.filter((e) => e.managerId === cur && e.status !== "TERMINATED");
      for (const d of direct) {
        if (!visited.has(d.id)) {
          subordinates.push(d);
          queue.push(d.id);
        }
      }
    }
    return subordinates;
  }

  async getTeamAttendance(employeeIds, date) {
    const set = new Set(employeeIds);
    return mockDb.attendance.filter((a) => set.has(a.employeeId) && a.date === date);
  }

  async getTeamLeaves(employeeIds) {
    const set = new Set(employeeIds);
    return mockDb.leaves.filter((l) => set.has(l.employeeId));
  }

  async getTeamTasks(employeeIds) {
    const set = new Set(employeeIds);
    return mockDb.tasks.filter((t) => t.assigneeIds.some((a) => set.has(a)));
  }

  async getTeamTimesheets(directReportIds) {
    const set = new Set(directReportIds);
    return mockDb.timesheets.filter((ts) => set.has(ts.employeeId) && ts.status === "SUBMITTED");
  }

  async getActiveReviewCycle() {
    const cycle = mockDb.cycles.find((c) => c.status === "ACTIVE");
    return cycle ? { ...cycle } : null;
  }

  async getTeamReviews(reviewerId, cycleId) {
    return mockDb.reviews.filter((r) => r.reviewerId === reviewerId && r.cycleId === cycleId);
  }

  async reassignTask(taskId, fromId, toId) {
    const task = mockDb.tasks.find((t) => t.id === taskId);
    if (!task) return null;

    task.assigneeIds = task.assigneeIds.filter((id) => id !== fromId);
    if (!task.assigneeIds.includes(toId)) {
      task.assigneeIds.push(toId);
    }
    if (task.flag === "DELAYED_ON_LEAVE") {
      task.flag = "NORMAL";
    }
    return { ...task };
  }
}

// -------------------------------------------------------------
// [3. Layer 3: Domain Service Simulation]
// -------------------------------------------------------------
class MockTeamService {
  constructor(repo = new MockTeamRepository()) {
    this.repo = repo;
  }

  isAdminRole(role) {
    return role === "SUPER_ADMIN" || role === "HR_ADMIN";
  }

  sanitize(e) {
    const { password, ...safe } = e;
    return safe;
  }

  async getTeamOverview(actor, rawFilter) {
    const filterValidation = validateTeamFilterInput(rawFilter);
    if (!filterValidation.ok) {
      return { ok: false, error: filterValidation.error };
    }

    const filter = filterValidation.data;
    const targetDate = filter.date || "2026-11-12";

    const directReports = await this.repo.getDirectReports(actor.id);
    const subordinates = await this.repo.getAllSubordinates(actor.id);
    const isManager = directReports.length > 0 || this.isAdminRole(actor.role);

    if (!isManager) {
      return {
        ok: true,
        data: {
          isManager: false,
          directReportsCount: 0,
          subordinatesCount: 0,
          metrics: {
            outTodayCount: 0,
            outTodayNames: [],
            pendingLeaveCount: 0,
            flaggedTaskCount: 0,
            reviewsToWriteCount: 0,
          },
          workload: [],
          pendingLeaves: [],
          flaggedTasks: [],
          timesheets: [],
          reviews: [],
          activeCycle: null,
        },
      };
    }

    const teamMembers = filter.includeIndirect ? subordinates : directReports;
    const teamMemberIds = teamMembers.map((e) => e.id);
    const directIds = new Set(directReports.map((e) => e.id));

    const attendance = await this.repo.getTeamAttendance(teamMemberIds, targetDate);
    const leaves = await this.repo.getTeamLeaves(teamMemberIds);
    const tasks = await this.repo.getTeamTasks(teamMemberIds);
    const timesheets = await this.repo.getTeamTimesheets(Array.from(directIds));
    const activeCycle = await this.repo.getActiveReviewCycle();
    const reviews = activeCycle ? await this.repo.getTeamReviews(actor.id, activeCycle.id) : [];

    const outToday = teamMembers.filter((e) =>
      leaves.some(
        (l) => l.employeeId === e.id && l.status === "APPROVED" && l.startDate <= targetDate && l.endDate >= targetDate
      )
    );

    const pendingLeaves = leaves
      .filter((l) => l.status === "PENDING" && teamMemberIds.includes(l.employeeId))
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .map((l) => {
        const emp = teamMembers.find((e) => e.id === l.employeeId);
        const empName = emp ? `${emp.firstName} ${emp.lastName}` : "Employee";
        const tasksDue = tasks.filter(
          (t) =>
            t.assigneeIds.includes(l.employeeId) &&
            !t.completedAt &&
            t.dueDate &&
            t.dueDate >= l.startDate &&
            t.dueDate <= l.endDate
        );
        const overlapping = teamMembers.filter(
          (s) =>
            s.id !== l.employeeId &&
            leaves.some(
              (x) =>
                x.employeeId === s.id &&
                x.status === "APPROVED" &&
                x.startDate <= l.endDate &&
                x.endDate >= l.startDate
            )
        );

        return {
          ...l,
          employeeName: empName,
          tasksDueInWindowCount: tasksDue.length,
          overlappingPeersCount: overlapping.length,
        };
      });

    const openTasks = tasks.filter((t) => !t.completedAt);
    const flagged = openTasks.filter((t) => t.flag !== "NORMAL");

    const enrichedFlagged = flagged.map((task) => {
      const fromId = task.assigneeIds.find((id) => teamMemberIds.includes(id)) || task.assigneeIds[0];
      const fromEmp = teamMembers.find((e) => e.id === fromId);
      const assigneeName = fromEmp ? `${fromEmp.firstName} ${fromEmp.lastName}` : "Team Member";

      let suggestedPeerCover = null;
      if (fromEmp) {
        const peers = teamMembers.filter((p) => p.id !== fromId && p.departmentId === fromEmp.departmentId);
        if (peers.length > 0) {
          const peerLoads = peers.map((p) => ({
            id: p.id,
            name: `${p.firstName} ${p.lastName}`,
            openTasksCount: openTasks.filter((t) => t.assigneeIds.includes(p.id)).length,
          }));
          peerLoads.sort((a, b) => a.openTasksCount - b.openTasksCount);
          suggestedPeerCover = peerLoads[0];
        }
      }

      return {
        ...task,
        assigneeName,
        suggestedPeerCover,
      };
    });

    const workload = teamMembers.map((e) => {
      const att = attendance.find((a) => a.employeeId === e.id);
      const memberOpen = openTasks.filter((t) => t.assigneeIds.includes(e.id));
      const overdue = memberOpen.filter((t) => t.dueDate && t.dueDate < targetDate).length;
      const fl = memberOpen.filter((t) => t.flag !== "NORMAL").length;
      const upcoming = leaves
        .filter((l) => l.employeeId === e.id && l.status === "APPROVED" && l.endDate >= targetDate)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];

      const count = memberOpen.length;
      const loadLevel = count >= 6 ? "red" : count >= 3 ? "amber" : "green";
      const loadLabel = count >= 6 ? "Overloaded" : count >= 3 ? "Busy" : "Available";

      return {
        employee: this.sanitize(e),
        isDirect: directIds.has(e.id),
        attendanceStatus: att?.status || null,
        upcomingLeave: upcoming
          ? { startDate: upcoming.startDate, endDate: upcoming.endDate, type: upcoming.type }
          : null,
        openTasksCount: count,
        overdueTasksCount: overdue,
        flaggedTasksCount: fl,
        loadLevel,
        loadLabel,
      };
    });

    return {
      ok: true,
      data: {
        isManager: true,
        directReportsCount: directReports.length,
        subordinatesCount: subordinates.length,
        metrics: {
          outTodayCount: outToday.length,
          outTodayNames: outToday.map((e) => e.firstName),
          pendingLeaveCount: pendingLeaves.length,
          flaggedTaskCount: enrichedFlagged.length,
          reviewsToWriteCount: reviews.filter((r) => r.status !== "COMPLETED").length,
        },
        workload,
        pendingLeaves,
        flaggedTasks: enrichedFlagged,
        timesheets,
        reviews,
        activeCycle,
      },
    };
  }

  async reassignTaskCover(actor, rawInput) {
    const validation = validateReassignTaskInput(rawInput);
    if (!validation.ok) {
      return { ok: false, error: validation.error };
    }

    const { taskId, fromEmployeeId, toEmployeeId } = validation.data;
    const isAdmin = this.isAdminRole(actor.role);
    if (!isAdmin) {
      const subs = await this.repo.getAllSubordinates(actor.id);
      const isSubordinate = subs.some((s) => s.id === fromEmployeeId);
      if (!isSubordinate) {
        return { ok: false, error: "Only administrators or direct managers can reassign tasks for this employee." };
      }
    }

    const fromEmp = mockDb.employees.find((e) => e.id === fromEmployeeId);
    const toEmp = mockDb.employees.find((e) => e.id === toEmployeeId);
    if (!fromEmp || !toEmp) {
      return { ok: false, error: "Assignee employees not found." };
    }

    const updatedTask = await this.repo.reassignTask(taskId, fromEmployeeId, toEmployeeId);
    if (!updatedTask) {
      return { ok: false, error: "Task not found." };
    }

    const fromName = `${fromEmp.firstName} ${fromEmp.lastName}`;
    const toName = `${toEmp.firstName} ${toEmp.lastName}`;

    mockDb.activity.unshift({
      actorId: actor.id,
      action: "UPDATE",
      entity: "Task",
      message: `${actor.firstName ?? "Manager"} reassigned task “${updatedTask.title}” from ${fromName} to ${toName}.`,
      category: "WORK",
    });

    mockDb.notifications.unshift({
      recipientId: toEmployeeId,
      title: "Task Reassigned to You",
      message: `You have been assigned to cover “${updatedTask.title}” previously with ${fromName}.`,
      category: "WORK",
      link: "/employee/tasks",
    });

    return { ok: true, data: updatedTask };
  }
}

// -------------------------------------------------------------
// [4. Execution & Verification Assertions]
// -------------------------------------------------------------
async function runTests() {
  console.log("================================================================================");
  console.log("   PAGE 16: MY TEAM & DEPARTMENT COLLABORATION HUB - TEST SUITE                 ");
  console.log("================================================================================");

  let passed = 0;
  const test = (desc, fn) => {
    try {
      fn();
      passed++;
      console.log(`  ✔ [PASS] ${desc}`);
    } catch (e) {
      console.error(`  ✖ [FAIL] ${desc}`);
      console.error(e);
      process.exit(1);
    }
  };

  const asyncTest = async (desc, fn) => {
    try {
      await fn();
      passed++;
      console.log(`  ✔ [PASS] ${desc}`);
    } catch (e) {
      console.error(`  ✖ [FAIL] ${desc}`);
      console.error(e);
      process.exit(1);
    }
  };

  // --- LAYER 1: VALIDATION ---
  console.log("\n[LAYER 1: VALIDATIONS]");
  test("Team filter validation handles undefined or empty inputs safely", () => {
    const res = validateTeamFilterInput(undefined);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.data.includeIndirect, true);
  });

  test("Team filter validation accepts valid YYYY-MM-DD date", () => {
    const res = validateTeamFilterInput({ date: "2026-11-12", includeIndirect: false });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.data.date, "2026-11-12");
    assert.strictEqual(res.data.includeIndirect, false);
  });

  test("Team filter validation rejects malformed date format", () => {
    const res = validateTeamFilterInput({ date: "12/11/2026" });
    assert.strictEqual(res.ok, false);
    assert.match(res.error, /Date must be formatted YYYY-MM-DD/);
  });

  test("Reassign task validation accepts valid payload", () => {
    const res = validateReassignTaskInput({ taskId: "t1", fromEmployeeId: "e4", toEmployeeId: "e5" });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.data.taskId, "t1");
    assert.strictEqual(res.data.fromEmployeeId, "e4");
    assert.strictEqual(res.data.toEmployeeId, "e5");
  });

  test("Reassign task validation rejects empty payload or missing taskId", () => {
    const res = validateReassignTaskInput({});
    assert.strictEqual(res.ok, false);
    assert.match(res.error, /Task ID is required/);
  });

  test("Reassign task validation rejects same from and to employee", () => {
    const res = validateReassignTaskInput({ taskId: "t1", fromEmployeeId: "e4", toEmployeeId: "e4" });
    assert.strictEqual(res.ok, false);
    assert.match(res.error, /Cannot reassign task to the same employee/);
  });

  // --- LAYER 2: REPOSITORY DATA ACCESS ---
  console.log("\n[LAYER 2: REPOSITORY LAYER]");
  const repo = new MockTeamRepository();

  await asyncTest("Repository retrieves immediate direct reports", async () => {
    const reports = await repo.getDirectReports("e3");
    assert.strictEqual(reports.length, 2);
    assert.deepStrictEqual(reports.map((r) => r.id).sort(), ["e4", "e5"]);
  });

  await asyncTest("Repository recursively retrieves all subordinates beneath a manager", async () => {
    const subs = await repo.getAllSubordinates("e1");
    assert.ok(subs.length >= 4);
    assert.ok(subs.some((s) => s.id === "e4"));
  });

  await asyncTest("Repository retrieves team attendance and leaves", async () => {
    const att = await repo.getTeamAttendance(["e4", "e5"], "2026-11-12");
    assert.strictEqual(att.length, 2);
    const leaves = await repo.getTeamLeaves(["e4", "e5"]);
    assert.strictEqual(leaves.length, 2);
  });

  await asyncTest("Repository reassigns task and resets flag", async () => {
    const updated = await repo.reassignTask("t1", "e4", "e5");
    assert.strictEqual(updated.id, "t1");
    assert.ok(updated.assigneeIds.includes("e5"));
    assert.ok(!updated.assigneeIds.includes("e4"));
    assert.strictEqual(updated.flag, "NORMAL");
    // Reset back for subsequent service tests
    mockDb.tasks.find((t) => t.id === "t1").assigneeIds = ["e4"];
    mockDb.tasks.find((t) => t.id === "t1").flag = "DELAYED_ON_LEAVE";
  });

  // --- LAYER 3: DOMAIN SERVICE ---
  console.log("\n[LAYER 3: DOMAIN SERVICE]");
  const service = new MockTeamService(repo);

  await asyncTest("Non-manager employee receives isManager: false and empty queues", async () => {
    const actor = { id: "e6", role: "EMPLOYEE", firstName: "Individual", lastName: "Contributor" };
    const res = await service.getTeamOverview(actor);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.data.isManager, false);
    assert.strictEqual(res.data.workload.length, 0);
  });

  await asyncTest("Manager actor receives full overview with metrics and workloads", async () => {
    const actor = { id: "e3", role: "MANAGER", firstName: "Vikram", lastName: "Iyer" };
    const res = await service.getTeamOverview(actor);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.data.isManager, true);
    assert.strictEqual(res.data.directReportsCount, 2);
    assert.strictEqual(res.data.metrics.outTodayCount, 1);
    assert.deepStrictEqual(res.data.metrics.outTodayNames, ["Rahul"]);
    assert.strictEqual(res.data.metrics.pendingLeaveCount, 1);
    assert.strictEqual(res.data.metrics.flaggedTaskCount, 1);
    assert.strictEqual(res.data.metrics.reviewsToWriteCount, 1);
  });

  await asyncTest("Pending leaves compute contextual risk assessment (tasks due & overlapping leaves)", async () => {
    const actor = { id: "e3", role: "MANAGER", firstName: "Vikram", lastName: "Iyer" };
    const res = await service.getTeamOverview(actor);
    assert.strictEqual(res.ok, true);
    const pending = res.data.pendingLeaves[0];
    assert.strictEqual(pending.employeeId, "e5");
    // Task t2 is due 2026-11-20, outside leave 2026-11-13 to 2026-11-15 -> tasksDueInWindowCount = 0
    assert.strictEqual(pending.tasksDueInWindowCount, 0);
    // Overlapping peer e4 is approved on leave 2026-11-12 to 2026-11-14 -> overlappingPeersCount = 1
    assert.strictEqual(pending.overlappingPeersCount, 1);
  });

  await asyncTest("Flagged tasks recommend intelligent peer cover from same department", async () => {
    const actor = { id: "e3", role: "MANAGER", firstName: "Vikram", lastName: "Iyer" };
    const res = await service.getTeamOverview(actor);
    assert.strictEqual(res.ok, true);
    const fl = res.data.flaggedTasks[0];
    assert.strictEqual(fl.id, "t1");
    assert.strictEqual(fl.assigneeName, "Rahul Verma");
    assert.ok(fl.suggestedPeerCover);
    assert.strictEqual(fl.suggestedPeerCover.id, "e5");
    assert.strictEqual(fl.suggestedPeerCover.name, "Sneha Roy");
  });

  await asyncTest("Team workload table classifies load levels and labels accurately", async () => {
    const actor = { id: "e3", role: "MANAGER", firstName: "Vikram", lastName: "Iyer" };
    const res = await service.getTeamOverview(actor);
    assert.strictEqual(res.ok, true);
    const rowE4 = res.data.workload.find((w) => w.employee.id === "e4");
    assert.ok(rowE4);
    assert.strictEqual(rowE4.openTasksCount, 2);
    assert.strictEqual(rowE4.overdueTasksCount, 1);
    assert.strictEqual(rowE4.flaggedTasksCount, 1);
    assert.strictEqual(rowE4.loadLevel, "green");
    assert.strictEqual(rowE4.loadLabel, "Available");
    assert.strictEqual(rowE4.attendanceStatus, "PRESENT");
  });

  await asyncTest("Reassigning task cover emits audit log and recipient notification", async () => {
    const actor = { id: "e3", role: "MANAGER", firstName: "Vikram", lastName: "Iyer" };
    const res = await service.reassignTaskCover(actor, { taskId: "t1", fromEmployeeId: "e4", toEmployeeId: "e5" });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.data.id, "t1");
    assert.ok(res.data.assigneeIds.includes("e5"));
    assert.strictEqual(mockDb.activity[0].action, "UPDATE");
    assert.strictEqual(mockDb.activity[0].entity, "Task");
    assert.strictEqual(mockDb.notifications[0].recipientId, "e5");
  });

  await asyncTest("Unauthorized actor cannot reassign tasks outside their reporting line", async () => {
    const unauthorizedActor = { id: "e6", role: "EMPLOYEE", firstName: "Solo", lastName: "Dev" };
    const res = await service.reassignTaskCover(unauthorizedActor, { taskId: "t1", fromEmployeeId: "e4", toEmployeeId: "e5" });
    assert.strictEqual(res.ok, false);
    assert.match(res.error, /Only administrators or direct managers can reassign tasks/);
  });

  console.log("================================================================================");
  console.log(`✔ TOTAL TESTS PASSED: ${passed}/17 (100% SUITE PASS)`);
  console.log("================================================================================");
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
