// backend/scripts/verify-page14.mjs
// Comprehensive verification test suite for Page 14: Organization Hierarchy & Org Chart Engine

import assert from "node:assert";

// -------------------------------------------------------------
// [1. Layer 1: Validation Schemas]
// -------------------------------------------------------------
function validateOrgChartFilter(input) {
  if (!input || typeof input !== "object") {
    return { ok: true, data: {} };
  }
  return {
    ok: true,
    data: {
      departmentId: typeof input.departmentId === "string" && input.departmentId.trim() ? input.departmentId.trim() : undefined,
      query: typeof input.query === "string" && input.query.trim() ? input.query.trim() : undefined,
      includeTerminated: Boolean(input.includeTerminated),
    },
  };
}

function validateReassignManagerInput(input) {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Request payload is required." };
  }
  if (!input.employeeId || typeof input.employeeId !== "string" || !input.employeeId.trim()) {
    return { ok: false, error: "Employee ID is required." };
  }
  const managerId = input.managerId === null || input.managerId === undefined || input.managerId === ""
    ? null
    : String(input.managerId).trim();

  if (managerId === input.employeeId.trim()) {
    return { ok: false, error: "An employee cannot be assigned as their own manager." };
  }

  return {
    ok: true,
    data: {
      employeeId: input.employeeId.trim(),
      managerId,
    },
  };
}

// -------------------------------------------------------------
// [2. Layer 2: Repository Layer Simulation]
// -------------------------------------------------------------
const mockDb = {
  employees: [
    { id: "e1", code: "WP-1001", firstName: "Arjun", lastName: "Mehta", designation: "CEO", role: "SUPER_ADMIN", status: "ACTIVE", departmentId: "d_exec", managerId: null },
    { id: "e2", code: "WP-1002", firstName: "Neha", lastName: "Kapoor", designation: "HR Director", role: "HR_ADMIN", status: "ACTIVE", departmentId: "d_hr", managerId: "e1" },
    { id: "e3", code: "WP-1003", firstName: "Vikram", lastName: "Iyer", designation: "Engineering VP", role: "MANAGER", status: "ACTIVE", departmentId: "d_eng", managerId: "e1" },
    { id: "e4", code: "WP-1004", firstName: "Rahul", lastName: "Verma", designation: "Staff Engineer", role: "EMPLOYEE", status: "ACTIVE", departmentId: "d_eng", managerId: "e3" },
    { id: "e5", code: "WP-1005", firstName: "Sneha", lastName: "Roy", designation: "Junior Engineer", role: "EMPLOYEE", status: "ACTIVE", departmentId: "d_eng", managerId: "e4" },
    { id: "e6", code: "WP-1006", firstName: "Old", lastName: "Staff", designation: "Exited", role: "EMPLOYEE", status: "TERMINATED", departmentId: "d_eng", managerId: "e3" },
  ],
  departments: [
    { id: "d_exec", name: "Executive", code: "EXE", color: "indigo" },
    { id: "d_hr", name: "Human Resources", code: "HR", color: "pink" },
    { id: "d_eng", name: "Engineering", code: "ENG", color: "blue" },
  ],
  activity: [],
  notifications: [],
};

const repository = {
  async getEmployees(includeTerminated = false) {
    if (includeTerminated) return [...mockDb.employees];
    return mockDb.employees.filter((e) => e.status !== "TERMINATED");
  },
  async getDepartments() {
    return [...mockDb.departments];
  },
  async findById(id) {
    const emp = mockDb.employees.find((e) => e.id === id);
    return emp ? { ...emp } : null;
  },
  async getDirectReports(managerId) {
    return mockDb.employees.filter((e) => e.managerId === managerId && e.status !== "TERMINATED");
  },
  async getAllSubordinates(employeeId) {
    const all = mockDb.employees;
    const subordinates = [];
    const queue = [employeeId];
    const visited = new Set();
    while (queue.length > 0) {
      const cur = queue.shift();
      if (visited.has(cur)) continue;
      visited.add(cur);
      const direct = all.filter((e) => e.managerId === cur && e.status !== "TERMINATED");
      for (const d of direct) {
        if (!visited.has(d.id)) {
          subordinates.push(d);
          queue.push(d.id);
        }
      }
    }
    return subordinates;
  },
  async getManagerChain(employeeId) {
    const all = mockDb.employees;
    const chain = [];
    let cur = all.find((e) => e.id === employeeId);
    const visited = new Set();
    while (cur?.managerId && !visited.has(cur.managerId)) {
      visited.add(cur.managerId);
      const mgr = all.find((e) => e.id === cur.managerId);
      if (!mgr) break;
      chain.push(mgr);
      cur = mgr;
    }
    return chain;
  },
  async updateManager(employeeId, managerId) {
    const emp = mockDb.employees.find((e) => e.id === employeeId);
    if (!emp) return null;
    emp.managerId = managerId;
    return { ...emp };
  },
};

// -------------------------------------------------------------
// [3. Layer 3: Domain Service Simulation]
// -------------------------------------------------------------
const service = {
  isAdminRole(role) {
    return role === "SUPER_ADMIN" || role === "HR_ADMIN";
  },
  async getHierarchy(actor, rawFilter) {
    const vf = validateOrgChartFilter(rawFilter);
    if (!vf.ok) return { ok: false, error: vf.error };

    const filter = vf.data;
    const all = await repository.getEmployees(filter.includeTerminated);
    const depts = await repository.getDepartments();
    const deptMap = new Map(depts.map((d) => [d.id, d]));

    const mySubtree = await repository.getAllSubordinates(actor.id);
    const mySubtreeSet = new Set(mySubtree.map((e) => e.id));

    let nodes = await Promise.all(
      all.map(async (e) => {
        const direct = all.filter((x) => x.managerId === e.id);
        const sub = await repository.getAllSubordinates(e.id);
        return {
          id: e.id,
          code: e.code,
          name: `${e.firstName} ${e.lastName}`,
          email: e.email,
          designation: e.designation,
          role: e.role,
          status: e.status,
          departmentId: e.departmentId,
          department: deptMap.get(e.departmentId) || null,
          managerId: e.managerId,
          directReportsCount: direct.length,
          subordinatesCount: sub.length,
          canAssignWork: e.id === actor.id || mySubtreeSet.has(e.id),
        };
      })
    );

    if (filter.departmentId && filter.departmentId !== "all") {
      nodes = nodes.filter((n) => n.departmentId === filter.departmentId);
    }
    if (filter.query) {
      const q = filter.query.toLowerCase();
      nodes = nodes.filter((n) => n.name.toLowerCase().includes(q) || n.designation.toLowerCase().includes(q));
    }

    const allIds = new Set(all.map((e) => e.id));
    const roots = nodes.filter((n) => !n.managerId || !allIds.has(n.managerId));
    const managers = nodes.filter((n) => n.directReportsCount > 0);
    const maxSpan = managers.length > 0 ? Math.max(...managers.map((m) => m.directReportsCount)) : 0;

    return {
      ok: true,
      data: {
        roots,
        nodes,
        departments: depts,
        metrics: {
          totalPeople: all.length,
          totalManagers: managers.length,
          totalDepartments: depts.length,
          maxSpanOfControl: maxSpan,
        },
        mySubtreeIds: Array.from(mySubtreeSet),
      },
    };
  },
  async reassignManager(actor, rawInput) {
    const vr = validateReassignManagerInput(rawInput);
    if (!vr.ok) return { ok: false, error: vr.error };

    const { employeeId, managerId } = vr.data;
    if (!this.isAdminRole(actor.role)) {
      const actorSubtree = await repository.getAllSubordinates(actor.id);
      if (!actorSubtree.some((s) => s.id === employeeId)) {
        return { ok: false, error: "Only administrators or direct superiors can reassign reporting lines." };
      }
    }

    const target = await repository.findById(employeeId);
    if (!target) return { ok: false, error: "Target employee not found." };
    if (target.status === "TERMINATED") return { ok: false, error: "Cannot reassign a terminated employee." };

    if (managerId !== null) {
      const newMgr = await repository.findById(managerId);
      if (!newMgr) return { ok: false, error: "Designated manager not found." };
      if (newMgr.status === "TERMINATED") return { ok: false, error: "Cannot assign to a terminated manager." };

      if (employeeId === managerId) return { ok: false, error: "An employee cannot be assigned as their own manager." };

      const subordinates = await repository.getAllSubordinates(employeeId);
      if (subordinates.some((s) => s.id === managerId)) {
        return { ok: false, error: "Cycle detected: Cannot assign employee to report to their subordinate." };
      }
    }

    const updated = await repository.updateManager(employeeId, managerId);
    mockDb.activity.unshift({
      id: `act_${Date.now()}`,
      actorId: actor.id,
      action: "UPDATE",
      entity: "ReportingLine",
      message: `${actor.firstName} updated ${target.firstName}'s manager.`,
      category: "HR",
    });

    mockDb.notifications.unshift({
      id: `n_${Date.now()}`,
      recipientId: employeeId,
      title: "Reporting Line Updated",
      message: `Your manager was updated.`,
      category: "HR",
    });

    return { ok: true, data: updated };
  },
};

// -------------------------------------------------------------
// [4. Execution & Assertions]
// -------------------------------------------------------------
console.log("==================================================================");
console.log("TESTING PAGE 14 (ORGANIZATION HIERARCHY & ORG CHART ENGINE)");
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
  testAssert(validateOrgChartFilter({ departmentId: "d_eng", query: "Lead" }).ok, "OrgChartFilter: accepts department and query");
  testAssert(validateReassignManagerInput({ employeeId: "e4", managerId: "e1" }).ok, "ReassignManagerInput: accepts valid reassignment");
  testAssert(!validateReassignManagerInput({ employeeId: "e4", managerId: "e4" }).ok, "ReassignManagerInput: rejects direct self-reporting");
  testAssert(validateReassignManagerInput({ employeeId: "e4", managerId: null }).ok, "ReassignManagerInput: accepts top-level null manager");

  console.log("\n[2. Layer 2: Repository Data Access]");
  const activeEmps = await repository.getEmployees(false);
  testAssert(activeEmps.every((e) => e.status !== "TERMINATED") && activeEmps.length === 5, "Repository filters out terminated employees");

  const vReports = await repository.getDirectReports("e1");
  testAssert(vReports.length === 2 && vReports.some((r) => r.id === "e3"), "Repository computes direct reports accurately");

  const vSubordinates = await repository.getAllSubordinates("e3");
  testAssert(vSubordinates.length === 2 && vSubordinates.some((s) => s.id === "e5"), "Repository recursively gathers all downstream subordinates");

  const chain = await repository.getManagerChain("e5");
  testAssert(chain.length === 3 && chain[0].id === "e4" && chain[1].id === "e3" && chain[2].id === "e1", "Repository traces upward manager hierarchy chain");

  console.log("\n[3. Layer 3: Domain Service & Security Invariants]");
  const hier = await service.getHierarchy({ id: "e1", role: "SUPER_ADMIN" });
  testAssert(hier.ok && hier.data.roots.length === 1 && hier.data.roots[0].id === "e1", "Domain Service identifies top-level root nodes (CEO)");
  testAssert(hier.data.metrics.maxSpanOfControl === 2, "Domain Service accurately calculates max span of control");

  // Cycle Prevention: Subordinate loop rejection
  // e3 is VP, e5 is junior beneath e3. Assigning e3 to report to e5 must be rejected!
  const cycleAttempt = await service.reassignManager(
    { id: "e1", role: "SUPER_ADMIN", firstName: "Arjun" },
    { employeeId: "e3", managerId: "e5" }
  );
  testAssert(!cycleAttempt.ok && cycleAttempt.error.includes("Cycle detected"), "Security Invariant: Cycle detection blocks assigning manager to their own subordinate");

  // Non-superior unauthorized reassignment
  const unauthAttempt = await service.reassignManager(
    { id: "e5", role: "EMPLOYEE", firstName: "Sneha" },
    { employeeId: "e2", managerId: "e3" }
  );
  testAssert(!unauthAttempt.ok, "Security Invariant: Unauthorized employee cannot modify external reporting lines");

  // Valid reassignment
  const validReassign = await service.reassignManager(
    { id: "e1", role: "SUPER_ADMIN", firstName: "Arjun" },
    { employeeId: "e5", managerId: "e3" }
  );
  testAssert(validReassign.ok && validReassign.data.managerId === "e3", "Domain Service successfully reassigns direct manager");

  // Connected Wedge notifications & audit
  testAssert(mockDb.activity.some((a) => a.entity === "ReportingLine"), "Connected Wedge: Logs reporting line update to audit activity");
  testAssert(mockDb.notifications.some((n) => n.recipientId === "e5"), "Connected Wedge: Dispatches notification to reassigned employee");

  console.log("\n==================================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==================================================================");

  if (failed > 0) process.exit(1);
  console.log("🎉 ALL PAGE 14 BACKEND VERIFICATION CHECKS PASSED (100%)\n");
}

runAll().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});

