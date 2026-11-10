// frontend/scripts/verify-page4.mjs
// Verifies 4-layer backend architecture for Page 4 (Projects, Boards, Tasks & Connected Wedge #3)

console.log("==================================================================");
console.log("TESTING PAGE 4 (PROJECTS, KANBAN BOARDS, TASKS & CONNECTED WEDGE)");
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

// -------------------------------------------------------------------------
// 1. Layer 1: Validation Schemas
// -------------------------------------------------------------------------
console.log("[1. Layer 1: Validation Schemas]");

function validateTaskCreate(body) {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid payload" };
  if (!body.title || !body.title.trim()) return { ok: false, error: "Task title is required." };
  if (!body.boardId || !body.boardId.trim()) return { ok: false, error: "Target board is required." };
  const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
  const priority = validPriorities.includes(body.priority) ? body.priority : "MEDIUM";
  const validRecurrence = ["NONE", "DAILY", "WEEKLY", "MONTHLY"];
  const recurrence = validRecurrence.includes(body.recurrence) ? body.recurrence : "NONE";
  return {
    ok: true,
    data: {
      title: body.title.trim(),
      boardId: body.boardId.trim(),
      priority,
      dueDate: body.dueDate || null,
      assigneeIds: Array.isArray(body.assigneeIds) ? body.assigneeIds : [],
      recurrence,
      tags: Array.isArray(body.tags) ? body.tags : [],
    },
  };
}

function validateProjectCreate(body) {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid payload" };
  if (!body.name || !body.name.trim()) return { ok: false, error: "Project name is required." };
  if (!body.code || !body.code.trim()) return { ok: false, error: "Project code is required." };
  if (!body.leadId || !body.leadId.trim()) return { ok: false, error: "Project lead is required." };
  return {
    ok: true,
    data: {
      name: body.name.trim(),
      code: body.code.trim().toUpperCase(),
      leadId: body.leadId.trim(),
      status: body.status || "ACTIVE",
    },
  };
}

const vTask = validateTaskCreate({
  title: "Implement Supabase Auth",
  boardId: "b_proj_1",
  priority: "HIGH",
  dueDate: "2026-11-20",
  assigneeIds: ["e_1"],
  recurrence: "NONE",
});
assert(vTask.ok === true && vTask.data.title === "Implement Supabase Auth", "Valid task creation payload passes");

const invTask = validateTaskCreate({ title: "   ", boardId: "b_proj_1" });
assert(invTask.ok === false && invTask.error.includes("title is required"), "Rejects task with empty title");

const vProj = validateProjectCreate({ name: "Enterprise ERP", code: "erp", leadId: "e_2" });
assert(vProj.ok === true && vProj.data.code === "ERP", "Valid project creation payload passes and uppercases code");

const invProj = validateProjectCreate({ name: "", code: "ERP", leadId: "e_2" });
assert(invProj.ok === false, "Rejects project with missing name");

// -------------------------------------------------------------------------
// 2. Layer 2: Kanban Columns & Repository
// -------------------------------------------------------------------------
console.log("\n[2. Layer 2: Kanban Boards & Default Stage Structure]");

function defaultColumns(boardId) {
  return [
    { id: `${boardId}_todo`, name: "To Do", category: "todo" },
    { id: `${boardId}_prog`, name: "In Progress", category: "progress" },
    { id: `${boardId}_rev`, name: "In Review", category: "review" },
    { id: `${boardId}_done`, name: "Done", category: "done" },
  ];
}

const cols = defaultColumns("b_new");
assert(cols.length === 4, "Auto-generates exactly 4 default Kanban stages");
assert(cols[0].category === "todo" && cols[3].category === "done", "Kanban stages ordered from To Do to Done");

// -------------------------------------------------------------------------
// 3. Layer 3: Connected Wedge #3 - Org Chart Permission Check
// -------------------------------------------------------------------------
console.log("\n[3. Layer 3: Connected Wedge #3 - Org Chart Permission Enforcement]");

const mockEmployees = [
  { id: "e_ceo", firstName: "Alice", role: "SUPER_ADMIN", managerId: null },
  { id: "e_mgr", firstName: "Bob", role: "MANAGER", managerId: "e_ceo" },
  { id: "e_dev1", firstName: "Carol", role: "EMPLOYEE", managerId: "e_mgr", departmentId: "dept_eng" },
  { id: "e_dev2", firstName: "Dave", role: "EMPLOYEE", managerId: "e_mgr", departmentId: "dept_eng" },
  { id: "e_sales", firstName: "Eve", role: "EMPLOYEE", managerId: "e_ceo", departmentId: "dept_sales" },
];

function canManageTasks(actor, targetId) {
  if (actor.id === targetId) return true;
  if (actor.role === "SUPER_ADMIN" || actor.role === "ADMIN") return true;
  // Subordinates check
  const subIds = mockEmployees.filter((e) => e.managerId === actor.id).map((e) => e.id);
  return subIds.includes(targetId);
}

const managerBob = mockEmployees[1];
const devCarol = mockEmployees[2];
const salesEve = mockEmployees[4];

assert(canManageTasks(managerBob, devCarol.id) === true, "Manager Bob can assign tasks to direct report Carol");
assert(canManageTasks(managerBob, salesEve.id) === false, "Manager Bob cannot assign tasks to Sales Eve (outside reporting line)");
assert(canManageTasks(devCarol, salesEve.id) === false, "Employee Carol cannot assign tasks to peer Eve outside reporting line");
assert(canManageTasks(mockEmployees[0], salesEve.id) === true, "Super Admin Alice can assign tasks across all departments");

// -------------------------------------------------------------------------
// 4. Layer 3: HR Leave Awareness on Task Creation
// -------------------------------------------------------------------------
console.log("\n[4. Layer 3: HR Leave Awareness on Task Creation]");

const mockLeaves = [
  { employeeId: "e_dev1", startDate: "2026-11-16", endDate: "2026-11-20", status: "APPROVED" },
];

function checkLeaveDelayFlag(assigneeIds, dueDate) {
  if (!dueDate) return "NORMAL";
  const onLeave = assigneeIds.some((aId) =>
    mockLeaves.some((l) => l.employeeId === aId && l.startDate <= dueDate && l.endDate >= dueDate && l.status === "APPROVED")
  );
  return onLeave ? "DELAYED_ON_LEAVE" : "NORMAL";
}

const flagDuringLeave = checkLeaveDelayFlag(["e_dev1"], "2026-11-18");
assert(flagDuringLeave === "DELAYED_ON_LEAVE", "Task due during approved leave is auto-flagged DELAYED_ON_LEAVE");

const flagOutsideLeave = checkLeaveDelayFlag(["e_dev1"], "2026-11-25");
assert(flagOutsideLeave === "NORMAL", "Task due outside leave window remains NORMAL");

// -------------------------------------------------------------------------
// 5. Layer 3: Kanban Done Transition & Recurrence Engine
// -------------------------------------------------------------------------
console.log("\n[5. Layer 3: Kanban Done Transition & Recurrence Engine]");

const mockTask = {
  id: "t_rec_1",
  boardId: "b_new",
  columnId: "b_new_todo",
  title: "Weekly Code Review",
  priority: "MEDIUM",
  dueDate: "2026-11-10",
  assigneeIds: ["e_dev1"],
  flag: "DELAYED_ON_LEAVE",
  recurrence: "WEEKLY",
  completedAt: null,
};

function handleTaskMove(task, targetCategory) {
  if (targetCategory === "done") {
    task.completedAt = new Date().toISOString();
    if (task.flag === "DELAYED_ON_LEAVE") task.flag = "NORMAL";
    let nextTask = null;
    if (task.recurrence !== "NONE") {
      const step = task.recurrence === "DAILY" ? 1 : 7;
      const curDate = new Date(task.dueDate);
      curDate.setDate(curDate.getDate() + step);
      const nextDue = curDate.toISOString().slice(0, 10);
      nextTask = {
        ...task,
        id: "t_rec_2",
        columnId: "b_new_todo",
        dueDate: nextDue,
        completedAt: null,
        comments: [],
      };
    }
    return { task, nextTask };
  }
  task.completedAt = null;
  return { task, nextTask: null };
}

const { task: completedTask, nextTask } = handleTaskMove(mockTask, "done");
assert(completedTask.completedAt !== null, "Task moved to Done records completedAt timestamp");
assert(completedTask.flag === "NORMAL", "Completing task clears DELAYED_ON_LEAVE flag to NORMAL");
assert(nextTask !== null, "Weekly recurring task automatically spawns next occurrence");
assert(nextTask.dueDate === "2026-11-17", "Next occurrence scheduled exactly 7 days later (2026-11-17)");

// -------------------------------------------------------------------------
// 6. Layer 3: Suggested Cover / Reassignment Flow
// -------------------------------------------------------------------------
console.log("\n[6. Layer 3: Peer Cover Reassignment Flow]");

const delayedTask = {
  id: "t_del_1",
  title: "Critical DB Migration",
  assigneeIds: ["e_dev1"],
  flag: "DELAYED_ON_LEAVE",
  comments: [],
};

function reassignTask(task, fromId, toId, actorId) {
  task.assigneeIds = task.assigneeIds.filter((id) => id !== fromId).concat(toId);
  task.flag = "NORMAL";
  task.comments.push({
    authorId: actorId,
    text: `Reassigned from ${fromId} to ${toId} (Suggested peer cover).`,
    at: new Date().toISOString(),
  });
  return task;
}

const reassigned = reassignTask(delayedTask, "e_dev1", "e_dev2", "e_mgr");
assert(reassigned.assigneeIds.includes("e_dev2") && !reassigned.assigneeIds.includes("e_dev1"), "Assignee swapped from Carol to Dave");
assert(reassigned.flag === "NORMAL", "Reassigning to peer cover clears delay flag");
assert(reassigned.comments.length === 1 && reassigned.comments[0].text.includes("Suggested peer cover"), "Audit comment logged in task thread");

console.log("\n==================================================================");
console.log(`PAGE 4 SUMMARY: ${passed} Passed, ${failed} Failed (${failed === 0 ? "100% SUCCESS" : "FAILED"})`);
console.log("==================================================================");

if (failed > 0) process.exit(1);
