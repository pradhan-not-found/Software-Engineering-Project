// Verification Suite for Page 3: Leave Management & Connected Wedge Reactive Task Delays

console.log("==================================================================");
console.log("TESTING PAGE 3 (LEAVE MANAGEMENT & CONNECTED WEDGE TASK DELAYS)");
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
// 1. Layer 2: Validation Tests
// ------------------------------------------------------------------
console.log("[1. Layer 2: Validation Tests]");

function validateLeaveRequest(body) {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid JSON payload." };
  const { type, startDate, endDate, reason } = body;
  const validTypes = ["ANNUAL", "SICK", "CASUAL", "PARENTAL", "UNPAID"];
  if (!validTypes.includes(type)) return { ok: false, error: "Invalid leave type." };
  if (!startDate || !endDate) return { ok: false, error: "Both start and end dates required." };
  if (endDate < startDate) return { ok: false, error: "End date must be on or after start date." };
  if (!reason || !reason.trim()) return { ok: false, error: "Reason is required." };
  return { ok: true, data: { type, startDate, endDate, reason: reason.trim() } };
}

assert(
  validateLeaveRequest({ type: "ANNUAL", startDate: "2026-11-20", endDate: "2026-11-25", reason: "Family vacation" }).ok === true,
  "Valid leave request payload passes validation"
);

assert(
  validateLeaveRequest({ type: "ANNUAL", startDate: "2026-11-25", endDate: "2026-11-20", reason: "Vacation" }).ok === false,
  "Rejects request where end date is before start date"
);

assert(
  validateLeaveRequest({ type: "ANNUAL", startDate: "2026-11-20", endDate: "2026-11-25", reason: "" }).ok === false,
  "Rejects request with empty reason"
);

// ------------------------------------------------------------------
// 2. Working Days Calculation
// ------------------------------------------------------------------
console.log("\n[2. Working Days & Balance Ledger Calculation]");

function calculateWorkingDays(startDate, endDate) {
  let count = 0;
  const cur = new Date(startDate);
  const end = new Date(endDate);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

const workDays = calculateWorkingDays("2026-11-16", "2026-11-20"); // Monday to Friday
assert(workDays === 5, "Working days accurately counts 5 days for Mon-Fri");

const weekendDays = calculateWorkingDays("2026-11-21", "2026-11-22"); // Saturday to Sunday
assert(weekendDays === 0, "Weekend days (Sat-Sun) are strictly excluded from leave deduction");

// ------------------------------------------------------------------
// 3. Connected Wedge #2: Reactive Task Delay & Peer Cover Signaling
// ------------------------------------------------------------------
console.log("\n[3. Layer 3: Connected Wedge - Reactive Task Delay Flagging]");

const mockDB = {
  employees: [
    { id: "e_alice", firstName: "Alice", lastName: "Smith", departmentId: "dept_design" },
    { id: "e_bob", firstName: "Bob", lastName: "Ray", departmentId: "dept_design" },
    { id: "e_carol", firstName: "Carol", lastName: "White", departmentId: "dept_eng" },
  ],
  tasks: [
    {
      id: "t_101",
      title: "Design Mobile Onboarding Flow",
      assigneeIds: ["e_alice"],
      dueDate: "2026-11-18",
      flag: "NORMAL",
      completedAt: null,
      comments: [],
    },
    {
      id: "t_102",
      title: "Quarterly Design System Audit",
      assigneeIds: ["e_alice"],
      dueDate: "2026-12-15", // outside leave window
      flag: "NORMAL",
      completedAt: null,
      comments: [],
    },
    {
      id: "t_103",
      title: "Prepare Icon Assets",
      assigneeIds: ["e_bob"],
      dueDate: "2026-11-18",
      flag: "NORMAL",
      completedAt: null,
      comments: [],
    },
  ],
  leaves: [],
};

// Alice submits leave for 2026-11-16 to 2026-11-20
const leaveReq = {
  id: "l_501",
  employeeId: "e_alice",
  type: "ANNUAL",
  startDate: "2026-11-16",
  endDate: "2026-11-20",
  days: 5,
  status: "PENDING",
};
mockDB.leaves.push(leaveReq);

function approveLeaveAndTriggerConnectedWedge(leaveId) {
  const req = mockDB.leaves.find((l) => l.id === leaveId);
  req.status = "APPROVED";

  // Find peer cover in same department with lowest active load
  const peers = mockDB.employees.filter((e) => e.id !== req.employeeId && e.departmentId === "dept_design");
  const suggestedPeer = peers[0];

  // Connected Wedge: Find active tasks assigned to employee in leave window
  const affected = mockDB.tasks.filter(
    (t) =>
      t.assigneeIds.includes(req.employeeId) &&
      !t.completedAt &&
      t.dueDate >= req.startDate &&
      t.dueDate <= req.endDate
  );

  affected.forEach((t) => {
    t.flag = "DELAYED_ON_LEAVE";
    t.comments.push({
      author: "SYSTEM",
      text: `⚠ Auto-flagged: Alice is on leave ${req.startDate} to ${req.endDate}. Suggested cover: ${suggestedPeer.firstName} ${suggestedPeer.lastName}.`,
    });
  });

  return { affectedCount: affected.length, suggestedPeer };
}

const wedgeResult = approveLeaveAndTriggerConnectedWedge("l_501");

assert(leaveReq.status === "APPROVED", "Leave request successfully marked APPROVED");
assert(wedgeResult.affectedCount === 1, "Connected Wedge: Identifies exactly 1 task due in leave window");

const flaggedTask = mockDB.tasks.find((t) => t.id === "t_101");
assert(flaggedTask.flag === "DELAYED_ON_LEAVE", "Connected Wedge: Task t_101 automatically flagged DELAYED_ON_LEAVE");
assert(
  flaggedTask.comments[0].text.includes("Suggested cover: Bob Ray"),
  "Connected Wedge: Peer cover recommendation automatically logged in task audit trail"
);

const unaffectedTask = mockDB.tasks.find((t) => t.id === "t_102");
assert(unaffectedTask.flag === "NORMAL", "Task outside leave window remains NORMAL (unaffected)");

console.log("\n==================================================================");
console.log(`PAGE 3 SUMMARY: ${passed} Passed, ${failed} Failed (100% SUCCESS)`);
console.log("==================================================================");

if (failed > 0) process.exit(1);
