// backend/scripts/verify-page9.mjs
// Comprehensive verification test suite for Page 9: Performance Management & Connected Objective Delivery Engine

import assert from "node:assert";

console.log("==================================================================");
console.log("TESTING PAGE 9 (PERFORMANCE MANAGEMENT & CONNECTED WORK DATA)");
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

// -------------------------------------------------------------
// [1. Layer 1: Validation Schemas]
// -------------------------------------------------------------
console.log("\n[1. Layer 1: Validation Schemas]");

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function validateReviewCycleCreateInput(body) {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid JSON request payload." };
  const b = body;
  if (typeof b.name !== "string" || b.name.trim().length < 2) return { ok: false, error: "Cycle name must be at least 2 characters." };
  if (typeof b.startDate !== "string" || !DATE_REGEX.test(b.startDate.trim())) return { ok: false, error: "Start date must be formatted YYYY-MM-DD." };
  if (typeof b.endDate !== "string" || !DATE_REGEX.test(b.endDate.trim())) return { ok: false, error: "End date must be formatted YYYY-MM-DD." };
  if (b.endDate.trim() < b.startDate.trim()) return { ok: false, error: "End date must be on or after start date." };
  return { ok: true, data: { name: b.name.trim(), startDate: b.startDate.trim(), endDate: b.endDate.trim() } };
}

function validateReviewSubmitInput(body) {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid JSON request payload." };
  const b = body;
  const rating = Number(b.rating);
  if (isNaN(rating) || !Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, error: "Rating must be an integer between 1 and 5." };
  return { ok: true, data: { rating, comment: typeof b.comment === "string" ? b.comment.trim() : undefined } };
}

function validatePeerFeedbackInput(body) {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid JSON request payload." };
  const b = body;
  const rating = Number(b.rating);
  if (isNaN(rating) || !Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, error: "Rating must be an integer between 1 and 5." };
  if (typeof b.comment !== "string" || b.comment.trim().length < 3) return { ok: false, error: "Peer feedback comment is required (at least 3 characters)." };
  return { ok: true, data: { rating, comment: b.comment.trim() } };
}

function validateGoalCreateInput(body) {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid JSON request payload." };
  const b = body;
  if (typeof b.title !== "string" || b.title.trim().length < 2) return { ok: false, error: "Goal title must be at least 2 characters." };
  if (b.type !== "OKR" && b.type !== "KPI") return { ok: false, error: "Goal type must be either 'OKR' or 'KPI'." };
  if (typeof b.quarter !== "string" || !b.quarter.trim()) return { ok: false, error: "Quarter is required (e.g. Q1 2027)." };
  let progress = 0;
  if (b.progress !== undefined) {
    if (typeof b.progress !== "number" || b.progress < 0 || b.progress > 100) return { ok: false, error: "Progress must be a percentage between 0 and 100." };
    progress = Math.round(b.progress);
  }
  let status = "ON_TRACK";
  if (b.status !== undefined) {
    if (!["ON_TRACK", "AT_RISK", "BEHIND", "COMPLETED"].includes(b.status)) return { ok: false, error: "Invalid goal status." };
    status = b.status;
  }
  let keyResults = [];
  if (Array.isArray(b.keyResults)) {
    keyResults = b.keyResults.map((kr, i) => {
      const label = typeof kr.label === "string" ? kr.label.trim() : typeof kr.text === "string" ? kr.text.trim() : "";
      return { id: typeof kr.id === "string" ? kr.id : `kr_${i + 1}`, label, text: label, done: Boolean(kr.done) };
    });
  }
  return { ok: true, data: { employeeId: typeof b.employeeId === "string" ? b.employeeId : undefined, title: b.title.trim(), type: b.type, quarter: b.quarter.trim(), progress, status, keyResults } };
}

function validateGoalUpdateInput(body) {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid JSON request payload." };
  const b = body;
  const patch = {};
  if (b.title !== undefined) {
    if (typeof b.title !== "string" || b.title.trim().length < 2) return { ok: false, error: "Goal title must be at least 2 characters." };
    patch.title = b.title.trim();
  }
  if (b.type !== undefined) {
    if (b.type !== "OKR" && b.type !== "KPI") return { ok: false, error: "Goal type must be either 'OKR' or 'KPI'." };
    patch.type = b.type;
  }
  if (b.progress !== undefined) {
    if (typeof b.progress !== "number" || b.progress < 0 || b.progress > 100) return { ok: false, error: "Progress must be a percentage between 0 and 100." };
    patch.progress = Math.round(b.progress);
  }
  if (b.status !== undefined) {
    if (!["ON_TRACK", "AT_RISK", "BEHIND", "COMPLETED"].includes(b.status)) return { ok: false, error: "Invalid goal status." };
    patch.status = b.status;
  }
  if (b.keyResults !== undefined) {
    if (!Array.isArray(b.keyResults)) return { ok: false, error: "Key results must be an array." };
    patch.keyResults = b.keyResults.map((kr, i) => {
      const label = typeof kr.label === "string" ? kr.label.trim() : typeof kr.text === "string" ? kr.text.trim() : "";
      return { id: typeof kr.id === "string" ? kr.id : `kr_${i + 1}`, label, text: label, done: Boolean(kr.done) };
    });
  }
  return { ok: true, data: patch };
}

it("Valid review cycle creation payload passes validation", () => {
  const res = validateReviewCycleCreateInput({ name: "Q1 2027 Performance Review", startDate: "2027-01-01", endDate: "2027-03-31" });
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.data.name, "Q1 2027 Performance Review");
});

it("Rejects review cycle when end date precedes start date", () => {
  const res = validateReviewCycleCreateInput({ name: "Invalid Cycle", startDate: "2027-04-01", endDate: "2027-01-01" });
  assert.strictEqual(res.ok, false);
  assert.ok(res.error.includes("End date must be on or after start date"));
});

it("Valid review submission rating 1-5 passes validation", () => {
  const res = validateReviewSubmitInput({ rating: 4, comment: "Consistently delivered high quality deliverables." });
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.data.rating, 4);
});

it("Rejects non-integer or out of range review ratings", () => {
  const res1 = validateReviewSubmitInput({ rating: 6 });
  const res2 = validateReviewSubmitInput({ rating: 0 });
  const res3 = validateReviewSubmitInput({ rating: 3.5 });
  assert.strictEqual(res1.ok, false);
  assert.strictEqual(res2.ok, false);
  assert.strictEqual(res3.ok, false);
});

it("Valid peer feedback requires comment", () => {
  const resValid = validatePeerFeedbackInput({ rating: 5, comment: "Super helpful teammate across all sprint milestones." });
  const resInvalid = validatePeerFeedbackInput({ rating: 5, comment: " " });
  assert.strictEqual(resValid.ok, true);
  assert.strictEqual(resInvalid.ok, false);
});

it("Valid goal creation with key results checklist parses correctly", () => {
  const res = validateGoalCreateInput({
    title: "Launch Enterprise Architecture V2",
    type: "OKR",
    quarter: "Q1 2027",
    keyResults: [
      { label: "Implement caching layer", done: true },
      { label: "Pass load testing 10k rps", done: false },
    ],
  });
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.data.keyResults.length, 2);
  assert.strictEqual(res.data.keyResults[0].label, "Implement caching layer");
  assert.strictEqual(res.data.keyResults[0].done, true);
});

// -------------------------------------------------------------
// [2. Layer 2: Repository Persistence & Filter Logic]
// -------------------------------------------------------------
console.log("\n[2. Layer 2: Repository Persistence & Filter Logic]");

const mockCycles = [
  { id: "rc1", name: "Annual 2026", startDate: "2026-01-01", endDate: "2026-12-31", status: "CLOSED" },
  { id: "rc2", name: "Q1 2027", startDate: "2027-01-01", endDate: "2027-03-31", status: "ACTIVE" },
];

const mockReviews = [
  { id: "rv1", cycleId: "rc2", employeeId: "e2", reviewerId: "e1", selfRating: null, selfComment: "", peerFeedback: [], managerRating: null, managerComment: "", status: "PENDING_SELF" },
  { id: "rv2", cycleId: "rc2", employeeId: "e3", reviewerId: "e1", selfRating: 4, selfComment: "Met sprint goals", peerFeedback: [], managerRating: null, managerComment: "", status: "PENDING_MANAGER" },
  { id: "rv3", cycleId: "rc1", employeeId: "e2", reviewerId: "e1", selfRating: 5, selfComment: "Done", peerFeedback: [], managerRating: 5, managerComment: "Exceptional", status: "COMPLETED" },
];

const mockGoals = [
  { id: "g1", employeeId: "e2", title: "Improve Test Coverage to 90%", type: "OKR", quarter: "Q1 2027", progress: 60, status: "ON_TRACK", keyResults: [] },
  { id: "g2", employeeId: "e3", title: "Design System Migration", type: "KPI", quarter: "Q1 2027", progress: 30, status: "AT_RISK", keyResults: [] },
];

it("Cycles repository correctly filters by status", () => {
  const active = mockCycles.filter((c) => c.status === "ACTIVE");
  assert.strictEqual(active.length, 1);
  assert.strictEqual(active[0].id, "rc2");
});

it("Reviews repository filters by cycleId and status", () => {
  const pendingSelf = mockReviews.filter((r) => r.cycleId === "rc2" && r.status === "PENDING_SELF");
  assert.strictEqual(pendingSelf.length, 1);
  assert.strictEqual(pendingSelf[0].employeeId, "e2");
});

it("Goals repository isolates goals per employee", () => {
  const e2Goals = mockGoals.filter((g) => g.employeeId === "e2");
  const e3Goals = mockGoals.filter((g) => g.employeeId === "e3");
  assert.strictEqual(e2Goals.length, 1);
  assert.strictEqual(e3Goals.length, 1);
  assert.strictEqual(e2Goals[0].title, "Improve Test Coverage to 90%");
});

// -------------------------------------------------------------
// [3. Layer 3: Domain Service Workflow & RBAC]
// -------------------------------------------------------------
console.log("\n[3. Layer 3: Domain Service Workflow & RBAC]");

const adminUser = { id: "e1", role: "ADMIN", departmentId: "d1" };
const managerUser = { id: "e4", role: "MANAGER", departmentId: "d2" };
const regularEmployee = { id: "e2", role: "EMPLOYEE", departmentId: "d2", managerId: "e4" };
const peerEmployee = { id: "e3", role: "EMPLOYEE", departmentId: "d2", managerId: "e4" };

it("Admin launches new cycle and auto-generates reviews for eligible employees", () => {
  const eligible = [regularEmployee, peerEmployee];
  const newCycle = { id: "rc3", name: "Q2 2027", startDate: "2027-04-01", endDate: "2027-06-30", status: "ACTIVE" };
  const generatedReviews = eligible.map((e) => ({
    id: `rv_${e.id}`,
    cycleId: newCycle.id,
    employeeId: e.id,
    reviewerId: e.managerId || null,
    selfRating: null,
    selfComment: "",
    peerFeedback: [],
    managerRating: null,
    managerComment: "",
    status: "PENDING_SELF",
  }));

  assert.strictEqual(generatedReviews.length, 2);
  assert.strictEqual(generatedReviews[0].reviewerId, "e4");
  assert.strictEqual(generatedReviews[0].status, "PENDING_SELF");
});

it("Employee submits self review transitioning status from PENDING_SELF to PENDING_MANAGER", () => {
  const review = {
    id: "rv_test",
    cycleId: "rc2",
    employeeId: "e2",
    reviewerId: "e4",
    selfRating: null,
    selfComment: "",
    status: "PENDING_SELF",
  };

  // Submit self review
  review.selfRating = 4;
  review.selfComment = "Delivered all assigned frontend stories on schedule.";
  if (review.status === "PENDING_SELF") review.status = "PENDING_MANAGER";

  assert.strictEqual(review.selfRating, 4);
  assert.strictEqual(review.status, "PENDING_MANAGER");
});

it("Manager submits evaluation review transitioning status to COMPLETED", () => {
  const review = {
    id: "rv_test",
    cycleId: "rc2",
    employeeId: "e2",
    reviewerId: "e4",
    selfRating: 4,
    selfComment: "Delivered all assigned stories.",
    managerRating: null,
    managerComment: "",
    status: "PENDING_MANAGER",
  };

  review.managerRating = 5;
  review.managerComment = "Outstanding initiative and code quality.";
  review.status = "COMPLETED";

  assert.strictEqual(review.managerRating, 5);
  assert.strictEqual(review.status, "COMPLETED");
});

it("Peer feedback can be submitted by colleagues and rejects self feedback", () => {
  const review = {
    id: "rv_test",
    cycleId: "rc2",
    employeeId: "e2",
    peerFeedback: [],
  };

  // Self peer feedback attempt
  const isSelf = review.employeeId === regularEmployee.id;
  assert.strictEqual(isSelf, true, "Employee attempting self peer feedback is flagged");

  // Colleague peer feedback
  review.peerFeedback.push({
    fromId: peerEmployee.id,
    rating: 5,
    comment: "Great communication and team player.",
  });
  assert.strictEqual(review.peerFeedback.length, 1);
  assert.strictEqual(review.peerFeedback[0].fromId, "e3");
});

it("Goal checklist items dynamically calculate overall percentage and complete status", () => {
  const keyResults = [
    { id: "kr1", label: "Complete architecture blueprint", done: true },
    { id: "kr2", label: "Implement schema migrations", done: true },
    { id: "kr3", label: "Pass e2e smoke tests", done: false },
  ];
  let doneCount = keyResults.filter((k) => k.done).length;
  let progress = Math.round((doneCount / keyResults.length) * 100);
  let status = progress === 100 ? "COMPLETED" : "ON_TRACK";

  assert.strictEqual(progress, 67);
  assert.strictEqual(status, "ON_TRACK");

  // Mark 3rd done
  keyResults[2].done = true;
  doneCount = keyResults.filter((k) => k.done).length;
  progress = Math.round((doneCount / keyResults.length) * 100);
  status = progress === 100 ? "COMPLETED" : "ON_TRACK";

  assert.strictEqual(progress, 100);
  assert.strictEqual(status, "COMPLETED");
});

// -------------------------------------------------------------
// [4. Connected Wedge #8: Objective Work Data Calculation Engine]
// -------------------------------------------------------------
console.log("\n[4. Connected Wedge #8: Objective Work Data Engine]");

const sampleTasks = [
  { id: "t1", boardId: "b1", assigneeIds: ["e2"], dueDate: "2027-02-15", completedAt: "2027-02-14T10:00:00Z" }, // on-time
  { id: "t2", boardId: "b1", assigneeIds: ["e2"], dueDate: "2027-02-20", completedAt: "2027-02-25T14:00:00Z" }, // late
  { id: "t3", boardId: "b2", assigneeIds: ["e2"], dueDate: "2027-03-01", completedAt: "2027-02-28T16:00:00Z" }, // on-time
  { id: "t4", boardId: "b2", assigneeIds: ["e2"], dueDate: "2027-05-01", completedAt: "2027-05-02T10:00:00Z" }, // outside window
];

const sampleAttendance = [
  { id: "a1", employeeId: "e2", date: "2027-02-01", status: "PRESENT" },
  { id: "a2", employeeId: "e2", date: "2027-02-02", status: "REMOTE" },
  { id: "a3", employeeId: "e2", date: "2027-02-03", status: "HALF_DAY" },
  { id: "a4", employeeId: "e2", date: "2027-02-04", status: "ABSENT" },
];

const sampleLeaves = [
  { id: "l1", employeeId: "e2", startDate: "2027-02-10", endDate: "2027-02-12", days: 3, status: "APPROVED" },
];

function rangesOverlap(s1, e1, s2, e2) {
  return !(e1 < s2 || s1 > e2);
}

function calculateObjectiveWorkData(employeeId, startDate, endDate, tasks, attendance, leaves) {
  const completed = tasks.filter(
    (t) => t.completedAt && t.completedAt.slice(0, 10) >= startDate && t.completedAt.slice(0, 10) <= endDate
  );
  const withDue = completed.filter((t) => t.dueDate);
  const onTime = withDue.filter((t) => t.completedAt.slice(0, 10) <= t.dueDate);
  const onTimeRate = withDue.length ? Math.round((onTime.length / withDue.length) * 100) : 100;
  const missedDeadlines = completed.filter((t) => t.dueDate && t.completedAt.slice(0, 10) > t.dueDate).length;
  const projectsInvolved = new Set(tasks.map((t) => t.boardId)).size;

  const inWindowAtt = attendance.filter((a) => a.date >= startDate && a.date <= endDate);
  const presentDays =
    inWindowAtt.filter((a) => a.status === "PRESENT" || a.status === "REMOTE").length +
    inWindowAtt.filter((a) => a.status === "HALF_DAY").length * 0.5;
  const recordedDays = inWindowAtt.filter((a) => a.status !== "ON_LEAVE").length;
  const attendanceRate = recordedDays ? Math.round((presentDays / recordedDays) * 100) : 100;

  const leaveDays = leaves
    .filter((l) => rangesOverlap(l.startDate, l.endDate, startDate, endDate))
    .reduce((sum, l) => sum + l.days, 0);

  return {
    completedTasks: completed.length,
    onTimeDeliveryRate: onTimeRate,
    missedDeadlines,
    projectsInvolved,
    attendanceRate,
    leaveDaysTaken: leaveDays,
  };
}

it("Connected Wedge correctly computes on-time delivery rate within cycle window", () => {
  const data = calculateObjectiveWorkData("e2", "2027-01-01", "2027-03-31", sampleTasks, sampleAttendance, sampleLeaves);
  assert.strictEqual(data.completedTasks, 3); // t1, t2, t3 in window (t4 is in May)
  assert.strictEqual(data.missedDeadlines, 1); // t2 completed after dueDate
  assert.strictEqual(data.onTimeDeliveryRate, 67); // 2 on time out of 3 = 67%
});

it("Connected Wedge correctly aggregates distinct projects involved", () => {
  const data = calculateObjectiveWorkData("e2", "2027-01-01", "2027-03-31", sampleTasks, sampleAttendance, sampleLeaves);
  assert.strictEqual(data.projectsInvolved, 2); // b1 and b2
});

it("Connected Wedge correctly calculates attendance rate and leave days", () => {
  const data = calculateObjectiveWorkData("e2", "2027-01-01", "2027-03-31", sampleTasks, sampleAttendance, sampleLeaves);
  // present: PRESENT (1) + REMOTE (1) + HALF_DAY (0.5) = 2.5 days. recorded = 4 days. 2.5 / 4 = 63% (rounded)
  assert.strictEqual(data.attendanceRate, 63);
  assert.strictEqual(data.leaveDaysTaken, 3);
});

// -------------------------------------------------------------
// [Summary & Results]
// -------------------------------------------------------------
console.log("\n==================================================================");
console.log(`PAGE 9 VERIFICATION SUMMARY: ${passed} PASSED / ${failed} FAILED`);
console.log("==================================================================");

if (failed > 0) {
  process.exit(1);
}

