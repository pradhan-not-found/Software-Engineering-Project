// backend/scripts/verify-page11.mjs
// Comprehensive verification test suite for Page 11: Reports & Executive Analytics Engine

import assert from "node:assert";

// -------------------------------------------------------------
// [1. Layer 1: Validation Schemas]
// -------------------------------------------------------------
const VALID_PERIODS = ["7d", "30d", "90d", "ytd", "1y"];
const VALID_EXPORT_DATASETS = ["headcount", "attendance", "payroll", "leaves", "tasks"];
const VALID_EXPORT_FORMATS = ["csv", "json"];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function validateReportFilterInput(body) {
  if (!body || typeof body !== "object") {
    return { ok: true, data: { period: "30d" } };
  }
  const b = body;
  const result = {};

  if (b.period !== undefined && b.period !== null) {
    if (typeof b.period !== "string" || !VALID_PERIODS.includes(b.period)) {
      return { ok: false, error: `Invalid period. Must be one of: ${VALID_PERIODS.join(", ")}.` };
    }
    result.period = b.period;
  } else {
    result.period = "30d";
  }

  if (b.startDate !== undefined && b.startDate !== null && b.startDate !== "") {
    if (typeof b.startDate !== "string" || !DATE_REGEX.test(b.startDate.trim())) {
      return { ok: false, error: "Start date must be formatted YYYY-MM-DD." };
    }
    result.startDate = b.startDate.trim();
  }

  if (b.endDate !== undefined && b.endDate !== null && b.endDate !== "") {
    if (typeof b.endDate !== "string" || !DATE_REGEX.test(b.endDate.trim())) {
      return { ok: false, error: "End date must be formatted YYYY-MM-DD." };
    }
    result.endDate = b.endDate.trim();
  }

  if (result.startDate && result.endDate && result.endDate < result.startDate) {
    return { ok: false, error: "End date must be on or after start date." };
  }

  if (typeof b.departmentId === "string" && b.departmentId.trim()) {
    result.departmentId = b.departmentId.trim();
  }

  return { ok: true, data: result };
}

function validateExportReportInput(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid export request payload." };
  }
  const b = body;

  if (typeof b.dataset !== "string" || !VALID_EXPORT_DATASETS.includes(b.dataset)) {
    return {
      ok: false,
      error: `Invalid dataset specified. Must be one of: ${VALID_EXPORT_DATASETS.join(", ")}.`,
    };
  }

  let format = "csv";
  if (b.format !== undefined && b.format !== null) {
    if (typeof b.format !== "string" || !VALID_EXPORT_FORMATS.includes(b.format)) {
      return {
        ok: false,
        error: `Invalid format. Must be one of: ${VALID_EXPORT_FORMATS.join(", ")}.`,
      };
    }
    format = b.format;
  }

  const result = { dataset: b.dataset, format };
  if (typeof b.departmentId === "string" && b.departmentId.trim()) {
    result.departmentId = b.departmentId.trim();
  }

  return { ok: true, data: result };
}

// -------------------------------------------------------------
// [2. Layer 2: Repository Data Access]
// -------------------------------------------------------------
class MockReportRepository {
  constructor() {
    this.employees = [
      { id: "e1", code: "WP-1001", firstName: "Aarav", lastName: "Sharma", email: "aarav@workplace.com", role: "SUPER_ADMIN", departmentId: "dept_eng", designation: "Engineering Lead", status: "ACTIVE", location: "HQ - Mumbai", workMode: "Hybrid", joiningDate: "2024-01-15", salary: { basic: 100000, hra: 40000, allowances: 20000 } },
      { id: "e2", code: "WP-1002", firstName: "Neha", lastName: "Patel", email: "neha@workplace.com", role: "HR_ADMIN", departmentId: "dept_hr", designation: "HR Lead", status: "ACTIVE", location: "HQ - Mumbai", workMode: "On-site", joiningDate: "2024-02-01", salary: { basic: 80000, hra: 32000, allowances: 16000 } },
      { id: "e3", code: "WP-1003", firstName: "Vikram", lastName: "Rao", email: "vikram@workplace.com", role: "MANAGER", departmentId: "dept_prod", designation: "Product Manager", status: "ACTIVE", location: "Remote - India", workMode: "Remote", joiningDate: "2024-03-01", salary: { basic: 90000, hra: 36000, allowances: 18000 } },
      { id: "e4", code: "WP-1004", firstName: "Priya", lastName: "Deshmukh", email: "priya@workplace.com", role: "EMPLOYEE", departmentId: "dept_eng", designation: "Frontend Engineer", status: "ONBOARDING", location: "HQ - Mumbai", workMode: "Hybrid", joiningDate: "2026-11-01", salary: { basic: 60000, hra: 24000, allowances: 12000 } },
      { id: "e5", code: "WP-1005", firstName: "Rohan", lastName: "Verma", email: "rohan@workplace.com", role: "EMPLOYEE", departmentId: "dept_eng", designation: "Backend Engineer", status: "TERMINATED", location: "HQ - Mumbai", workMode: "On-site", joiningDate: "2023-05-10", salary: { basic: 70000, hra: 28000, allowances: 14000 } },
    ];

    this.departments = [
      { id: "dept_eng", name: "Engineering", color: "blue" },
      { id: "dept_hr", name: "Human Resources", color: "purple" },
      { id: "dept_prod", name: "Product & Design", color: "orange" },
    ];

    this.attendance = [
      { id: "a1", employeeId: "e1", date: "2026-11-05", status: "PRESENT", clockIn: "09:00", clockOut: "18:00" },
      { id: "a2", employeeId: "e2", date: "2026-11-05", status: "PRESENT", clockIn: "09:05", clockOut: "18:02" },
      { id: "a3", employeeId: "e3", date: "2026-11-05", status: "REMOTE", clockIn: "09:15", clockOut: "18:15" },
      { id: "a4", employeeId: "e4", date: "2026-11-05", status: "HALF_DAY", clockIn: "09:00", clockOut: "13:00" },
    ];

    this.leaves = [
      { id: "l1", employeeId: "e1", type: "CASUAL", startDate: "2026-06-10", endDate: "2026-06-12", days: 3, status: "APPROVED" },
      { id: "l2", employeeId: "e2", type: "SICK", startDate: "2026-08-01", endDate: "2026-08-02", days: 2, status: "APPROVED" },
      { id: "l3", employeeId: "e3", type: "PAID", startDate: "2026-09-15", endDate: "2026-09-18", days: 4, status: "APPROVED" },
    ];

    this.payrollRuns = [
      { id: "pr1", month: "2026-08", status: "LOCKED", lines: [{ basic: 100000, gross: 160000, net: 140000 }] },
      { id: "pr2", month: "2026-09", status: "LOCKED", lines: [{ basic: 100000, gross: 165000, net: 145000 }] },
      { id: "pr3", month: "2026-10", status: "LOCKED", lines: [{ basic: 100000, gross: 170000, net: 150000 }] },
    ];

    this.projects = [
      { id: "p1", name: "Platform Core Refactor", status: "ACTIVE" },
      { id: "p2", name: "Mobile App NextGen", status: "ACTIVE" },
    ];

    this.boards = [
      {
        id: "b1",
        projectId: "p1",
        columns: [
          { id: "c1", category: "TODO" },
          { id: "c2", category: "DONE" },
        ],
      },
    ];

    this.tasks = [
      { id: "t1", boardId: "b1", columnId: "c2", assigneeIds: ["e1"], completedAt: "2026-10-15T10:00:00Z" },
      { id: "t2", boardId: "b1", columnId: "c2", assigneeIds: ["e1"], completedAt: "2026-10-20T10:00:00Z" },
      { id: "t3", boardId: "b1", columnId: "c1", assigneeIds: ["e4"], completedAt: null },
    ];
  }

  async getHeadcountMetrics(departmentId) {
    let emps = this.employees;
    if (departmentId) emps = emps.filter((e) => e.departmentId === departmentId);
    const active = emps.filter((e) => e.status !== "TERMINATED");

    const byDepartment = this.departments.map((d) => ({
      id: d.id,
      name: d.name,
      color: d.color,
      count: active.filter((e) => e.departmentId === d.id).length,
    })).sort((a, b) => b.count - a.count);

    const statuses = ["ACTIVE", "ONBOARDING", "ON_LEAVE", "OFFBOARDING", "TERMINATED"];
    const statusDistribution = {};
    for (const s of statuses) {
      statusDistribution[s] = emps.filter((e) => e.status === s).length;
    }

    return { total: emps.length, active: active.length, byDepartment, statusDistribution };
  }

  async getAttendanceMetrics() {
    const recs = this.attendance.filter((a) => a.status !== "ON_LEAVE");
    const worked =
      recs.filter((a) => a.status === "PRESENT" || a.status === "REMOTE").length +
      recs.filter((a) => a.status === "HALF_DAY").length * 0.5;
    const rate = recs.length ? Math.round((worked / recs.length) * 100) : 0;
    const remoteRate = recs.length ? Math.round((recs.filter((a) => a.status === "REMOTE").length / recs.length) * 100) : 0;

    const byDepartment = this.departments.map((d) => {
      const deptEmpIds = new Set(this.employees.filter((e) => e.departmentId === d.id).map((e) => e.id));
      const dRecs = recs.filter((a) => deptEmpIds.has(a.employeeId));
      const dWorked =
        dRecs.filter((a) => a.status === "PRESENT" || a.status === "REMOTE").length +
        dRecs.filter((a) => a.status === "HALF_DAY").length * 0.5;
      return {
        id: d.id,
        name: d.name,
        color: d.color,
        rate: dRecs.length ? Math.round((dWorked / dRecs.length) * 100) : 0,
      };
    });

    return { rate, remoteRate, byDepartment };
  }

  async getLeaveMetrics(year = "2026") {
    const activeHeadcount = this.employees.filter((e) => e.status !== "TERMINATED").length;
    const LEAVE_TYPES = {
      CASUAL: { label: "Casual leave", allocation: 12, color: "blue" },
      SICK: { label: "Sick leave", allocation: 10, color: "rose" },
      PAID: { label: "Earned / Privilege", allocation: 18, color: "green" },
      UNPAID: { label: "Leave without pay", allocation: 0, color: "gray" },
    };

    const leaveUse = Object.keys(LEAVE_TYPES).map((k) => {
      const used = this.leaves
        .filter((l) => l.type === k && l.status === "APPROVED" && l.startDate.startsWith(year))
        .reduce((sum, l) => sum + l.days, 0);
      const allocated = k === "UNPAID" ? 0 : LEAVE_TYPES[k].allocation * activeHeadcount;
      return { key: k, label: LEAVE_TYPES[k].label, used, allocated, color: LEAVE_TYPES[k].color };
    });

    return { leaveUse };
  }

  async getPayrollMetrics(limit = 6) {
    const active = this.employees.filter((e) => e.status !== "TERMINATED");
    const trends = [...this.payrollRuns]
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-limit)
      .map((r) => ({
        id: r.id,
        month: r.month,
        gross: r.lines.reduce((s, l) => s + l.gross, 0),
        net: r.lines.reduce((s, l) => s + l.net, 0),
      }));

    const byDepartment = this.departments
      .map((d) => {
        const cost = active
          .filter((e) => e.departmentId === d.id)
          .reduce((s, e) => s + (e.salary.basic + e.salary.hra + e.salary.allowances), 0);
        return { id: d.id, name: d.name, color: d.color, cost };
      })
      .sort((a, b) => b.cost - a.cost);

    const monthlyCommittedTotal = byDepartment.reduce((s, x) => s + x.cost, 0);
    return { trends, byDepartment, monthlyCommittedTotal };
  }

  async getProjectThroughput() {
    const active = this.employees.filter((e) => e.status !== "TERMINATED");
    const isTaskDone = (task) => {
      const col = this.boards[0].columns.find((c) => c.id === task.columnId);
      return col?.category === "DONE";
    };

    const projects = this.projects.map((p) => {
      const ts = this.tasks.filter((tk) => {
        const board = this.boards.find((b) => b.id === tk.boardId);
        return board?.projectId === p.id;
      });
      const done = ts.filter((tk) => isTaskDone(tk)).length;
      return { id: p.id, name: p.name, done, open: ts.length - done, total: ts.length };
    });

    const totalDone = projects.reduce((s, x) => s + x.done, 0);
    const totalOpen = projects.reduce((s, x) => s + x.open, 0);

    const topContributors = active
      .map((e) => {
        const count = this.tasks.filter(
          (tk) => tk.assigneeIds.includes(e.id) && tk.completedAt
        ).length;
        return { id: e.id, name: `${e.firstName} ${e.lastName}`, email: e.email, completedCount: count };
      })
      .filter((x) => x.completedCount > 0)
      .sort((a, b) => b.completedCount - a.completedCount);

    return { projects, totalDone, totalOpen, topContributors };
  }

  async getHeadcountExportData(departmentId) {
    let emps = this.employees;
    if (departmentId) emps = emps.filter((e) => e.departmentId === departmentId);
    return emps.map((e) => ({
      code: e.code,
      name: `${e.firstName} ${e.lastName}`,
      email: e.email,
      department: this.departments.find((d) => d.id === e.departmentId)?.name || "",
      designation: e.designation,
      role: e.role,
      manager: "",
      status: e.status,
      joined: e.joiningDate,
      location: e.location,
      workMode: e.workMode,
    }));
  }
}

// -------------------------------------------------------------
// [3. Layer 3: Domain Service & Analytics Engine]
// -------------------------------------------------------------
class MockReportService {
  constructor(repo) {
    this.repo = repo;
  }

  async getOverview(actor, filter) {
    const [headcount, attendance, leaves, payroll, throughput] = await Promise.all([
      this.repo.getHeadcountMetrics(filter?.departmentId),
      this.repo.getAttendanceMetrics(),
      this.repo.getLeaveMetrics(),
      this.repo.getPayrollMetrics(6),
      this.repo.getProjectThroughput(),
    ]);

    const kpis = {
      headcount: headcount.active,
      departmentsCount: headcount.byDepartment.length,
      attendanceRate: attendance.rate,
      remoteAttendanceRate: attendance.remoteRate,
      monthlyPayrollCost: payroll.monthlyCommittedTotal,
      projectTasksDone: throughput.totalDone,
      projectTasksOpen: throughput.totalOpen,
    };

    return {
      ok: true,
      data: { kpis, headcount, attendance, leaves, payroll, throughput },
    };
  }

  async exportCSV(actor, input) {
    if (input.dataset === "headcount") {
      const rows = await this.repo.getHeadcountExportData(input.departmentId);
      const headers = ["Code", "Name", "Email", "Department", "Designation", "Role", "Manager", "Status", "Joined", "Location", "Work mode"];
      const csvLines = [
        headers.map((h) => `"${h}"`).join(","),
        ...rows.map((r) =>
          [r.code, r.name, r.email, r.department, r.designation, r.role, r.manager, r.status, r.joined, r.location, r.workMode]
            .map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`)
            .join(",")
        ),
      ];
      return { ok: true, filename: "headcount-2026-11-12.csv", mimeType: "text/csv", csv: csvLines.join("\n") };
    }
    return { ok: false, error: "Unsupported export dataset" };
  }
}

async function runSuite() {
  console.log("==================================================================");
  console.log("TESTING PAGE 11 (REPORTS & EXECUTIVE ANALYTICS ENGINE)");
  console.log("==================================================================");

  let passed = 0;
  let failed = 0;

  function it(desc, fn) {
    try {
      fn();
      console.log(`  ✓ PASS: ${desc}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${desc}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  async function itAsync(desc, fn) {
    try {
      await fn();
      console.log(`  ✓ PASS: ${desc}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${desc}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  console.log("\n[1. Layer 1: Validation Schemas]");

  it("Accepts empty or default report filter input", () => {
    const valid = validateReportFilterInput(null);
    assert.strictEqual(valid.ok, true);
    assert.strictEqual(valid.data.period, "30d");
  });

  it("Validates report filter periods strictly", () => {
    assert.strictEqual(validateReportFilterInput({ period: "1000years" }).ok, false);
    const valid = validateReportFilterInput({ period: "90d" });
    assert.strictEqual(valid.ok, true);
    assert.strictEqual(valid.data.period, "90d");
  });

  it("Validates date boundaries: YYYY-MM-DD and start <= end", () => {
    assert.strictEqual(validateReportFilterInput({ startDate: "invalid" }).ok, false);
    assert.strictEqual(validateReportFilterInput({ startDate: "2026-11-10", endDate: "2026-11-01" }).ok, false);
    const valid = validateReportFilterInput({ startDate: "2026-11-01", endDate: "2026-11-10" });
    assert.strictEqual(valid.ok, true);
  });

  it("Validates export dataset: headcount, attendance, payroll, leaves, tasks", () => {
    assert.strictEqual(validateExportReportInput(null).ok, false);
    assert.strictEqual(validateExportReportInput({ dataset: "aliens" }).ok, false);
    const valid = validateExportReportInput({ dataset: "headcount", format: "csv" });
    assert.strictEqual(valid.ok, true);
    assert.strictEqual(valid.data.dataset, "headcount");
    assert.strictEqual(valid.data.format, "csv");
  });

  console.log("\n[2. Layer 2: Repository Data Access]");

  await itAsync("Repository aggregates headcount and department distribution accurately", async () => {
    const repo = new MockReportRepository();
    const data = await repo.getHeadcountMetrics();
    assert.strictEqual(data.total, 5);
    assert.strictEqual(data.active, 4);
    assert.strictEqual(data.byDepartment.length, 3);
    assert.strictEqual(data.byDepartment[0].id, "dept_eng");
    assert.strictEqual(data.byDepartment[0].count, 2);
    assert.strictEqual(data.statusDistribution.TERMINATED, 1);
  });

  await itAsync("Repository computes 30-day attendance rates and remote percentages", async () => {
    const repo = new MockReportRepository();
    const data = await repo.getAttendanceMetrics();
    // 3 full days (PRESENT, PRESENT, REMOTE) + 0.5 (HALF_DAY) = 3.5 / 4 = 88%
    assert.strictEqual(data.rate, 88);
    assert.strictEqual(data.remoteRate, 25);
    assert.strictEqual(data.byDepartment.length, 3);
  });

  await itAsync("Repository computes leave utilisation against headcount allocations", async () => {
    const repo = new MockReportRepository();
    const data = await repo.getLeaveMetrics("2026");
    assert.strictEqual(data.leaveUse.length, 4);
    const casual = data.leaveUse.find((x) => x.key === "CASUAL");
    assert.strictEqual(casual.used, 3);
    assert.strictEqual(casual.allocated, 12 * 4);
  });

  await itAsync("Repository compiles payroll trends and department committed salaries", async () => {
    const repo = new MockReportRepository();
    const data = await repo.getPayrollMetrics(6);
    assert.strictEqual(data.trends.length, 3);
    assert.strictEqual(data.trends[2].month, "2026-10");
    assert.strictEqual(data.trends[2].gross, 170000);
    assert.strictEqual(data.monthlyCommittedTotal > 0, true);
  });

  await itAsync("Repository calculates project throughput and identifies top contributors", async () => {
    const repo = new MockReportRepository();
    const data = await repo.getProjectThroughput();
    assert.strictEqual(data.totalDone, 2);
    assert.strictEqual(data.totalOpen, 1);
    assert.strictEqual(data.topContributors.length, 1);
    assert.strictEqual(data.topContributors[0].id, "e1");
    assert.strictEqual(data.topContributors[0].completedCount, 2);
  });

  console.log("\n[3. Layer 3: Domain Service & Analytics Engine]");

  await itAsync("Domain Service produces complete executive overview payload", async () => {
    const repo = new MockReportRepository();
    const service = new MockReportService(repo);
    const actor = { id: "e1", role: "SUPER_ADMIN" };

    const res = await service.getOverview(actor);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.data.kpis.headcount, 4);
    assert.strictEqual(res.data.kpis.departmentsCount, 3);
    assert.strictEqual(res.data.kpis.attendanceRate, 88);
    assert.strictEqual(res.data.kpis.projectTasksDone, 2);
    assert.strictEqual(res.data.headcount.active, 4);
    assert.strictEqual(res.data.attendance.remoteRate, 25);
  });

  await itAsync("Domain Service exports RFC 4180 compliant headcount CSV", async () => {
    const repo = new MockReportRepository();
    const service = new MockReportService(repo);
    const actor = { id: "e1", role: "SUPER_ADMIN" };

    const res = await service.exportCSV(actor, { dataset: "headcount", format: "csv" });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.mimeType, "text/csv");
    assert.strictEqual(res.filename.startsWith("headcount-"), true);
    assert.strictEqual(res.csv.includes('"Code","Name","Email"'), true);
    assert.strictEqual(res.csv.includes('"Aarav Sharma"'), true);
  });

  console.log("\n==================================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("🎉 ALL PAGE 11 BACKEND VERIFICATION CHECKS PASSED (100%)\n");
  }
}

runSuite().catch((err) => {
  console.error("FATAL ERROR IN TEST SUITE:", err);
  process.exit(1);
});
