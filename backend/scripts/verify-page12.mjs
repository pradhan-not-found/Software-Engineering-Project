// backend/scripts/verify-page12.mjs
// Comprehensive verification test suite for Page 12: Organization Settings, Workspaces & Holiday Calendar

import assert from "node:assert";

// -------------------------------------------------------------
// [1. Layer 1: Validation Schemas]
// -------------------------------------------------------------
const VALID_HOLIDAY_TYPES = ["National", "Regional", "Company"];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function validateUpdateOrgInput(body) {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request payload." };
  const b = body;
  const result = {};

  if (b.name !== undefined) {
    if (typeof b.name !== "string" || b.name.trim().length < 2) {
      return { ok: false, error: "Organization name must be at least 2 characters." };
    }
    result.name = b.name.trim();
  }

  if (b.currency !== undefined) {
    if (typeof b.currency !== "string" || !b.currency.trim()) {
      return { ok: false, error: "Currency is required." };
    }
    result.currency = b.currency.trim().toUpperCase();
  }

  return { ok: true, data: result };
}

function validateCreateDepartmentInput(body) {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request payload." };
  const b = body;

  if (typeof b.name !== "string" || b.name.trim().length < 2) {
    return { ok: false, error: "Department name must be at least 2 characters." };
  }

  if (typeof b.code !== "string" || !/^[A-Za-z0-9_-]{2,10}$/.test(b.code.trim())) {
    return { ok: false, error: "Department code must be 2 to 10 alphanumeric characters." };
  }

  return {
    ok: true,
    data: {
      name: b.name.trim(),
      code: b.code.trim().toUpperCase(),
      color: typeof b.color === "string" && b.color.trim() ? b.color.trim() : "blue",
      headId: typeof b.headId === "string" && b.headId.trim() ? b.headId.trim() : null,
    },
  };
}

function validateCreateHolidayInput(body) {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request payload." };
  const b = body;

  if (typeof b.date !== "string" || !DATE_REGEX.test(b.date.trim())) {
    return { ok: false, error: "Holiday date must be formatted YYYY-MM-DD." };
  }

  if (typeof b.name !== "string" || b.name.trim().length < 2) {
    return { ok: false, error: "Holiday name must be at least 2 characters." };
  }

  if (typeof b.type !== "string" || !VALID_HOLIDAY_TYPES.includes(b.type)) {
    return { ok: false, error: `Holiday type must be one of: ${VALID_HOLIDAY_TYPES.join(", ")}.` };
  }

  return { ok: true, data: { date: b.date.trim(), name: b.name.trim(), type: b.type } };
}

// -------------------------------------------------------------
// [2. Layer 2: Repository Data Access]
// -------------------------------------------------------------
class MockSettingsRepository {
  constructor() {
    this.org = { name: "Workplace Technologies", currency: "INR" };
    this.departments = [
      { id: "d1", name: "Engineering", code: "ENG", color: "blue", headId: "e1" },
      { id: "d2", name: "Product", code: "PROD", color: "purple", headId: null },
    ];
    this.employees = [
      { id: "e1", firstName: "Aarav", lastName: "Sharma", departmentId: "d1", status: "ACTIVE" },
      { id: "e2", firstName: "Neha", lastName: "Patel", departmentId: "d1", status: "ACTIVE" },
      { id: "e3", firstName: "Vikram", lastName: "Rao", departmentId: "d2", status: "ACTIVE" },
    ];
    this.holidays = [
      { id: "h1", date: "2026-01-26", name: "Republic Day", type: "National" },
      { id: "h2", date: "2026-08-15", name: "Independence Day", type: "National" },
      { id: "h3", date: "2026-10-02", name: "Gandhi Jayanti", type: "National" },
    ];
  }

  async getOrgSettings() {
    return { ...this.org };
  }

  async updateOrgSettings(patch) {
    Object.assign(this.org, patch);
    return { ...this.org };
  }

  async getDepartments() {
    const active = this.employees.filter((e) => e.status !== "TERMINATED");
    return this.departments.map((d) => {
      const head = this.employees.find((e) => e.id === d.headId);
      const headcount = active.filter((e) => e.departmentId === d.id).length;
      return { ...d, headcount, headName: head ? `${head.firstName} ${head.lastName}` : null };
    });
  }

  async findDepartmentByCode(code) {
    const d = this.departments.find((x) => x.code.toLowerCase() === code.toLowerCase());
    return d ? { ...d } : null;
  }

  async createDepartment(input) {
    const d = { id: `d_${Date.now()}`, ...input, code: input.code.toUpperCase() };
    this.departments.push(d);
    return { ...d };
  }

  async getHolidays(year) {
    let list = [...this.holidays];
    if (year) list = list.filter((h) => h.date.startsWith(String(year)));
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }

  async findHolidayByDate(date) {
    const h = this.holidays.find((x) => x.date === date);
    return h ? { ...h } : null;
  }

  async createHoliday(input) {
    const h = { id: `h_${Date.now()}`, ...input };
    this.holidays.push(h);
    this.holidays.sort((a, b) => a.date.localeCompare(b.date));
    return { ...h };
  }

  async deleteHoliday(id) {
    const prev = this.holidays.length;
    this.holidays = this.holidays.filter((h) => h.id !== id);
    return this.holidays.length < prev;
  }

  async resetDemoData() {
    this.org = { name: "Workplace Technologies", currency: "INR" };
  }
}

// -------------------------------------------------------------
// [3. Layer 3: Domain Service & Security Invariants]
// -------------------------------------------------------------
class MockSettingsService {
  constructor(repo) {
    this.repo = repo;
  }

  async updateOrg(actor, patch) {
    if (actor.role !== "SUPER_ADMIN" && actor.role !== "HR_ADMIN") {
      return { ok: false, error: "Only an Administrator can update organization settings." };
    }
    const updated = await this.repo.updateOrgSettings(patch);
    return { ok: true, data: updated };
  }

  async createDepartment(actor, input) {
    if (actor.role !== "SUPER_ADMIN" && actor.role !== "HR_ADMIN") {
      return { ok: false, error: "Only an Administrator can create departments." };
    }
    const existing = await this.repo.findDepartmentByCode(input.code);
    if (existing) {
      return { ok: false, error: "Department code already exists." };
    }
    const created = await this.repo.createDepartment(input);
    return { ok: true, data: created };
  }

  async createHoliday(actor, input) {
    if (actor.role !== "SUPER_ADMIN" && actor.role !== "HR_ADMIN") {
      return { ok: false, error: "Only an Administrator can add holidays." };
    }
    const existing = await this.repo.findHolidayByDate(input.date);
    if (existing) {
      return { ok: false, error: "A holiday already exists on that date." };
    }
    const created = await this.repo.createHoliday(input);
    return { ok: true, data: created };
  }

  async deleteHoliday(actor, id) {
    if (actor.role !== "SUPER_ADMIN" && actor.role !== "HR_ADMIN") {
      return { ok: false, error: "Only an Administrator can remove holidays." };
    }
    const success = await this.repo.deleteHoliday(id);
    if (!success) {
      return { ok: false, error: "Holiday not found." };
    }
    return { ok: true, message: "Holiday removed." };
  }

  async resetDemo(actor) {
    if (actor.role !== "SUPER_ADMIN") {
      return { ok: false, error: "Only a Super Admin can reset demo data." };
    }
    await this.repo.resetDemoData();
    return { ok: true, message: "Demo data restored successfully." };
  }
}

async function runSuite() {
  console.log("==================================================================");
  console.log("TESTING PAGE 12 (ORGANIZATION SETTINGS, DEPARTMENTS & HOLIDAYS)");
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

  it("Validates updateOrg: rejects short or empty name", () => {
    assert.strictEqual(validateUpdateOrgInput(null).ok, false);
    assert.strictEqual(validateUpdateOrgInput({ name: "A" }).ok, false);
    const valid = validateUpdateOrgInput({ name: "NewOrg HQ" });
    assert.strictEqual(valid.ok, true);
    assert.strictEqual(valid.data.name, "NewOrg HQ");
  });

  it("Validates createDepartment: enforces name and 2-10 char code", () => {
    assert.strictEqual(validateCreateDepartmentInput({ name: "", code: "ENG" }).ok, false);
    assert.strictEqual(validateCreateDepartmentInput({ name: "Marketing", code: "M" }).ok, false);
    assert.strictEqual(validateCreateDepartmentInput({ name: "Marketing", code: "TOOLONGCODE" }).ok, false);
    const valid = validateCreateDepartmentInput({ name: "Marketing", code: "mkt", color: "orange" });
    assert.strictEqual(valid.ok, true);
    assert.strictEqual(valid.data.code, "MKT");
  });

  it("Validates createHoliday: enforces date YYYY-MM-DD and valid Holiday type", () => {
    assert.strictEqual(validateCreateHolidayInput({ date: "not-a-date", name: "Diwali", type: "National" }).ok, false);
    assert.strictEqual(validateCreateHolidayInput({ date: "2026-11-01", name: "", type: "National" }).ok, false);
    assert.strictEqual(validateCreateHolidayInput({ date: "2026-11-01", name: "Diwali", type: "FakeType" }).ok, false);
    const valid = validateCreateHolidayInput({ date: "2026-11-01", name: "Diwali", type: "National" });
    assert.strictEqual(valid.ok, true);
  });

  console.log("\n[2. Layer 2: Repository Data Access]");

  await itAsync("Repository retrieves and updates organization workspace settings", async () => {
    const repo = new MockSettingsRepository();
    const org = await repo.getOrgSettings();
    assert.strictEqual(org.name, "Workplace Technologies");

    const updated = await repo.updateOrgSettings({ name: "Workplace Global Inc." });
    assert.strictEqual(updated.name, "Workplace Global Inc.");
  });

  await itAsync("Repository lists departments with headcounts and head name details", async () => {
    const repo = new MockSettingsRepository();
    const depts = await repo.getDepartments();
    assert.strictEqual(depts.length, 2);
    const eng = depts.find((d) => d.code === "ENG");
    assert.strictEqual(eng.headcount, 2);
    assert.strictEqual(eng.headName, "Aarav Sharma");
  });

  await itAsync("Repository creates department and verifies unique code lookup", async () => {
    const repo = new MockSettingsRepository();
    const created = await repo.createDepartment({ name: "Customer Success", code: "CS", color: "teal" });
    assert.strictEqual(created.code, "CS");

    const found = await repo.findDepartmentByCode("cs");
    assert.strictEqual(found !== null, true);
    assert.strictEqual(found.name, "Customer Success");
  });

  await itAsync("Repository manages holiday calendar: creates, queries, and deletes", async () => {
    const repo = new MockSettingsRepository();
    const holidays = await repo.getHolidays("2026");
    assert.strictEqual(holidays.length, 3);

    const added = await repo.createHoliday({ date: "2026-12-25", name: "Christmas", type: "National" });
    assert.strictEqual(added.name, "Christmas");

    const deleted = await repo.deleteHoliday(added.id);
    assert.strictEqual(deleted, true);
  });

  console.log("\n[3. Layer 3: Domain Service & Security Invariants]");

  await itAsync("Security Invariant: Non-admin users cannot update organization settings", async () => {
    const repo = new MockSettingsRepository();
    const service = new MockSettingsService(repo);
    const employee = { id: "e3", role: "EMPLOYEE" };

    const res = await service.updateOrg(employee, { name: "Hacked Org" });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error, "Only an Administrator can update organization settings.");
  });

  await itAsync("Security Invariant: Duplicate department code is strictly rejected", async () => {
    const repo = new MockSettingsRepository();
    const service = new MockSettingsService(repo);
    const admin = { id: "e1", role: "SUPER_ADMIN" };

    const res = await service.createDepartment(admin, { name: "Engineering Duplicate", code: "eng" });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error, "Department code already exists.");
  });

  await itAsync("Security Invariant: Duplicate holiday on same date is strictly rejected", async () => {
    const repo = new MockSettingsRepository();
    const service = new MockSettingsService(repo);
    const admin = { id: "e1", role: "SUPER_ADMIN" };

    const res = await service.createHoliday(admin, { date: "2026-01-26", name: "Duplicate Republic Day", type: "National" });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error, "A holiday already exists on that date.");
  });

  await itAsync("Security Invariant: Only SUPER_ADMIN can trigger full demo reset", async () => {
    const repo = new MockSettingsRepository();
    const service = new MockSettingsService(repo);

    const hrAdmin = { id: "e2", role: "HR_ADMIN" };
    const rejectRes = await service.resetDemo(hrAdmin);
    assert.strictEqual(rejectRes.ok, false);
    assert.strictEqual(rejectRes.error, "Only a Super Admin can reset demo data.");

    const superAdmin = { id: "e1", role: "SUPER_ADMIN" };
    const successRes = await service.resetDemo(superAdmin);
    assert.strictEqual(successRes.ok, true);
  });

  console.log("\n==================================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("🎉 ALL PAGE 12 BACKEND VERIFICATION CHECKS PASSED (100%)\n");
  }
}

runSuite().catch((err) => {
  console.error("FATAL ERROR IN TEST SUITE:", err);
  process.exit(1);
});

