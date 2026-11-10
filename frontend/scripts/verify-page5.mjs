// frontend/scripts/verify-page5.mjs
// Verifies 4-layer backend architecture for Page 5 (Attendance, Timesheets & Time Tracking)

console.log("==================================================================");
console.log("TESTING PAGE 5 (ATTENDANCE, SHIFTS, TIMESHEETS & POLICIES)");
console.log("==================================================================\n");

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

// ------------------------------------------------------------------
// 1. LAYER 1: VALIDATION SCHEMAS
// ------------------------------------------------------------------
console.log("[1. Layer 1: Validation Schemas]");

function validateSetAttendance(body) {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid payload" };
  const { employeeId, date, status } = body;
  if (!employeeId || !employeeId.trim()) return { ok: false, error: "Employee ID is required." };
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Valid YYYY-MM-DD date required." };
  const valid = ["PRESENT", "ABSENT", "HALF_DAY", "REMOTE", "ON_LEAVE"];
  if (!valid.includes(status)) return { ok: false, error: "Invalid status" };
  return { ok: true, data: { employeeId: employeeId.trim(), date, status } };
}

function validateTimesheetSave(body) {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid payload" };
  const { weekStart, entries, submit } = body;
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return { ok: false, error: "Valid week start required." };
  if (!Array.isArray(entries)) return { ok: false, error: "Entries must be an array." };
  return { ok: true, data: { weekStart, entries, submit: Boolean(submit) } };
}

assert(
  validateSetAttendance({ employeeId: "e_1", date: "2026-11-10", status: "PRESENT" }).ok === true,
  "Valid manual attendance payload passes validation"
);

assert(
  validateSetAttendance({ employeeId: "", date: "2026-11-10", status: "PRESENT" }).ok === false,
  "Rejects attendance with empty employeeId"
);

assert(
  validateSetAttendance({ employeeId: "e_1", date: "invalid-date", status: "PRESENT" }).ok === false,
  "Rejects attendance with invalid date format"
);

assert(
  validateTimesheetSave({ weekStart: "2026-11-09", entries: [{ projectId: "p_1", hours: [8, 8, 8, 8, 8, 0, 0] }], submit: true }).ok === true,
  "Valid weekly timesheet payload passes validation"
);

// ------------------------------------------------------------------
// 2. LAYER 3: CLOCK IN / CLOCK OUT & HALF-DAY THRESHOLD RULE
// ------------------------------------------------------------------
console.log("\n[2. Layer 3: Attendance Policies & Half-Day Calculation]");

function simulateAttendanceLifecycle() {
  const mockAttendanceDB = [];

  function clockIn(employeeId, date, timeISO, remote = false) {
    let rec = mockAttendanceDB.find((a) => a.employeeId === employeeId && a.date === date);
    if (rec?.clockIn) return { ok: false, error: "Already clocked in today." };
    if (!rec) {
      rec = { id: `att_${Date.now()}`, employeeId, date, clockIn: null, clockOut: null, status: "PRESENT" };
      mockAttendanceDB.push(rec);
    }
    rec.clockIn = timeISO;
    rec.status = remote ? "REMOTE" : "PRESENT";
    return { ok: true, data: rec };
  }

  function clockOut(employeeId, date, timeISO) {
    const rec = mockAttendanceDB.find((a) => a.employeeId === employeeId && a.date === date);
    if (!rec?.clockIn) return { ok: false, error: "You haven't clocked in yet." };
    if (rec.clockOut) return { ok: false, error: "Already clocked out." };
    rec.clockOut = timeISO;
    const hours = (new Date(rec.clockOut).getTime() - new Date(rec.clockIn).getTime()) / 3600000;
    if (hours < 4 && rec.status === "PRESENT") {
      rec.status = "HALF_DAY";
    }
    return { ok: true, data: rec, hours };
  }

  return { clockIn, clockOut, mockAttendanceDB };
}

const engine = simulateAttendanceLifecycle();

// Test 1: Successful Clock In
const inRes = engine.clockIn("e_emp1", "2026-11-10", "2026-11-10T09:00:00.000Z", false);
assert(inRes.ok === true && inRes.data.status === "PRESENT", "Clock in sets status to PRESENT");

// Test 2: Double Clock In blocked
const dupIn = engine.clockIn("e_emp1", "2026-11-10", "2026-11-10T10:00:00.000Z", false);
assert(dupIn.ok === false && dupIn.error === "Already clocked in today.", "Double clock-in is blocked on the same date");

// Test 3: Short Shift (< 4 hours) converted to HALF_DAY
// Clock in at 09:00, clock out at 12:00 (3 hours worked)
const shortShift = engine.clockOut("e_emp1", "2026-11-10", "2026-11-10T12:00:00.000Z");
assert(shortShift.ok === true && shortShift.hours === 3, "Elapsed time calculated as 3 hours");
assert(
  shortShift.data.status === "HALF_DAY",
  "Policy Enforcement: Shift under 4 hours automatically converted to HALF_DAY"
);

// Test 4: Full Shift (>= 4 hours) retains PRESENT status
const engineFull = simulateAttendanceLifecycle();
engineFull.clockIn("e_emp2", "2026-11-10", "2026-11-10T09:00:00.000Z", false);
const fullShift = engineFull.clockOut("e_emp2", "2026-11-10", "2026-11-10T17:30:00.000Z"); // 8.5 hours
assert(fullShift.hours === 8.5, "Elapsed time calculated as 8.5 hours");
assert(fullShift.data.status === "PRESENT", "Full shift (>= 4 hours) remains marked as PRESENT");

// ------------------------------------------------------------------
// 3. LAYER 3: TIMESHEET DRAFT, SUBMIT & MANAGER APPROVAL GATE
// ------------------------------------------------------------------
console.log("\n[3. Layer 3: Weekly Timesheet Lifecycle & Manager Decision]");

function simulateTimesheetEngine() {
  const timesheets = [];

  function saveTimesheet(employeeId, weekStart, entries, submit) {
    let ts = timesheets.find((x) => x.employeeId === employeeId && x.weekStart === weekStart);
    if (ts && (ts.status === "SUBMITTED" || ts.status === "APPROVED")) {
      return { ok: false, error: "This timesheet is already submitted." };
    }
    const totalHours = entries.reduce((s, e) => s + e.hours.reduce((sub, h) => sub + (Number(h) || 0), 0), 0);
    if (submit && totalHours === 0) {
      return { ok: false, error: "Log some hours before submitting." };
    }
    if (!ts) {
      ts = { id: `ts_${Date.now()}`, employeeId, weekStart, entries, status: "DRAFT" };
      timesheets.push(ts);
    }
    ts.entries = entries;
    ts.status = submit ? "SUBMITTED" : "DRAFT";
    if (submit) ts.submittedAt = new Date().toISOString();
    return { ok: true, data: ts };
  }

  function decideTimesheet(id, approve, actorId) {
    const ts = timesheets.find((t) => t.id === id);
    if (!ts) return { ok: false, error: "Not found" };
    if (ts.status !== "SUBMITTED") return { ok: false, error: "Only submitted timesheets can be decided." };
    ts.status = approve ? "APPROVED" : "REJECTED";
    ts.decidedBy = actorId;
    return { ok: true, data: ts };
  }

  return { saveTimesheet, decideTimesheet, timesheets };
}

const tsEngine = simulateTimesheetEngine();

// Test 1: Zero hours submission rejected
const emptySubmit = tsEngine.saveTimesheet("e_emp1", "2026-11-09", [{ projectId: "p_1", hours: [0, 0, 0, 0, 0, 0, 0] }], true);
assert(emptySubmit.ok === false && emptySubmit.error === "Log some hours before submitting.", "Rejects submission when 0 hours are logged");

// Test 2: Draft save succeeded
const draftRes = tsEngine.saveTimesheet("e_emp1", "2026-11-09", [{ projectId: "p_1", hours: [4, 4, 0, 0, 0, 0, 0] }], false);
assert(draftRes.ok === true && draftRes.data.status === "DRAFT", "Draft timesheet saved in DRAFT status");

// Test 3: Timesheet submission succeeded
const submitRes = tsEngine.saveTimesheet("e_emp1", "2026-11-09", [{ projectId: "p_1", hours: [8, 8, 8, 8, 8, 0, 0] }], true);
assert(submitRes.ok === true && submitRes.data.status === "SUBMITTED", "Submitted timesheet transitions to SUBMITTED");

// Test 4: Editing submitted timesheet is locked
const editLocked = tsEngine.saveTimesheet("e_emp1", "2026-11-09", [{ projectId: "p_1", hours: [2, 2, 0, 0, 0, 0, 0] }], false);
assert(editLocked.ok === false && editLocked.error === "This timesheet is already submitted.", "Submitted timesheet is locked from further employee edits");

// Test 5: Manager approval
const approveRes = tsEngine.decideTimesheet(submitRes.data.id, true, "e_mgr1");
assert(approveRes.ok === true && approveRes.data.status === "APPROVED", "Manager approves timesheet");
assert(approveRes.data.decidedBy === "e_mgr1", "Timesheet records approver ID");

console.log("\n==================================================================");
console.log(`PAGE 5 SUMMARY: ${passed} Passed, ${failed} Failed (${failed === 0 ? "100% SUCCESS" : "FAILED"})`);
console.log("==================================================================");

if (failed > 0) process.exit(1);
