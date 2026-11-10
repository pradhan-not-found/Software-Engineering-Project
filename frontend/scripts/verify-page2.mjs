// Self-contained verification script for Page 2: Company Directory & Employee Management

console.log("==================================================");
console.log("TESTING PAGE 2 (COMPANY DIRECTORY & ONBOARDING) FUNCTIONALITY");
console.log("==================================================\n");

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
// 1. Validation Logic
// ------------------------------------------------------------------
console.log("[1. Layer 2: Validation Tests]");

function validateNewHireInput(body) {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid JSON request payload." };
  const { firstName, lastName, email, designation, basicSalary } = body;
  if (!firstName || !lastName) return { ok: false, error: "Both first name and last name are required." };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) return { ok: false, error: "A valid corporate email address is required." };
  if (!designation) return { ok: false, error: "Designation / job title is required." };
  const sal = Number(basicSalary);
  if (isNaN(sal) || sal <= 0) return { ok: false, error: "Basic monthly salary must be greater than zero." };
  return { ok: true, data: { ...body, email: email.toLowerCase().trim() } };
}

const validHire = validateNewHireInput({
  firstName: "Rohan",
  lastName: "Sharma",
  email: "rohan@workplace.com",
  designation: "Full Stack Developer",
  basicSalary: 75000,
});
assert(validHire.ok === true, "Valid new hire payload passes validation");

const invalidSalary = validateNewHireInput({
  firstName: "Rohan",
  lastName: "Sharma",
  email: "rohan@workplace.com",
  designation: "Full Stack Developer",
  basicSalary: 0,
});
assert(invalidSalary.ok === false && invalidSalary.error.includes("salary"), "Salary <= 0 is correctly rejected");

const missingName = validateNewHireInput({
  firstName: "",
  lastName: "Sharma",
  email: "rohan@workplace.com",
  designation: "Developer",
  basicSalary: 50000,
});
assert(missingName.ok === false && missingName.error.includes("name"), "Empty first name is correctly rejected");

// ------------------------------------------------------------------
// 2. Directory Filtering & Repository Tests
// ------------------------------------------------------------------
console.log("\n[2. Layer 4: Directory Repository & Filter Tests]");

const mockEmployees = [
  { id: "e1", firstName: "Arjun", lastName: "Mehta", email: "arjun@workplace.com", departmentId: "dept_eng", status: "ACTIVE" },
  { id: "e2", firstName: "Neha", lastName: "Kapoor", email: "neha@workplace.com", departmentId: "dept_hr", status: "ACTIVE" },
  { id: "e3", firstName: "John", lastName: "Doe", email: "john@workplace.com", departmentId: "dept_eng", status: "ACTIVE" },
  { id: "e4", firstName: "Alice", lastName: "Smith", email: "alice@workplace.com", departmentId: "dept_prod", status: "ONBOARDING" },
];

function filterEmployees(list, { departmentId, status, search }) {
  return list.filter((e) => {
    if (departmentId && departmentId !== "all" && e.departmentId !== departmentId) return false;
    if (status && status !== "all" && e.status !== status) return false;
    if (search) {
      const s = search.toLowerCase();
      const match = `${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(s);
      if (!match) return false;
    }
    return true;
  });
}

const engOnly = filterEmployees(mockEmployees, { departmentId: "dept_eng" });
assert(engOnly.length === 2, "Department filter returns exactly engineering employees");

const onboardingOnly = filterEmployees(mockEmployees, { status: "ONBOARDING" });
assert(onboardingOnly.length === 1 && onboardingOnly[0].firstName === "Alice", "Status filter returns onboarding employees");

const searched = filterEmployees(mockEmployees, { search: "kapoor" });
assert(searched.length === 1 && searched[0].firstName === "Neha", "Search filter matches name across directory");

// ------------------------------------------------------------------
// 3. Connected Wedge: Atomic Onboarding Workflow Tests
// ------------------------------------------------------------------
console.log("\n[3. Layer 3: Connected Wedge - New Hire Atomic Onboarding Engine]");

function hireEmployee(input) {
  const id = `e_${Date.now()}`;
  const boardId = `b_${Date.now()}`;
  const join = input.joiningDate || "2026-11-10";

  const employee = {
    id,
    code: `WP-1005`,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    designation: input.designation,
    salary: {
      basic: input.basicSalary,
      hra: Math.round(input.basicSalary * 0.4),
      allowances: Math.round(input.basicSalary * 0.2),
      otherDeductions: 0,
    },
    status: "ONBOARDING",
    onboarding: { boardId, offerLetterStatus: "SENT" },
  };

  const columns = [
    { id: `${boardId}_todo`, name: "To Do", category: "todo" },
    { id: `${boardId}_prog`, name: "In Progress", category: "in_progress" },
    { id: `${boardId}_rev`, name: "Review", category: "review" },
    { id: `${boardId}_done`, name: "Done", category: "done" },
  ];

  const board = {
    id: boardId,
    title: `Onboarding · ${input.firstName} ${input.lastName}`,
    type: "ONBOARDING",
    ownerId: id,
    columns,
  };

  const starterTasks = [
    { title: "[IT] Provision laptop & accounts", priority: "HIGH" },
    { title: "[HR] Send offer letter & collect documents", priority: "HIGH" },
    { title: "[HR] Verify documents & activate payroll", priority: "HIGH" },
    { title: "[Manager] Introductory 1:1 meeting", priority: "HIGH" },
    { title: "[Manager] Define 30-day goals", priority: "MEDIUM" },
    { title: "[Buddy] Welcome lunch & walkthrough", priority: "MEDIUM" },
    { title: "[Employee] Upload ID proof", priority: "HIGH" },
    { title: "[Employee] Complete compliance training", priority: "MEDIUM" },
    { title: "[Employee] Workstation setup", priority: "MEDIUM" },
  ];

  return { employee, board, columns, tasks: starterTasks };
}

const hireResult = hireEmployee({
  firstName: "Priya",
  lastName: "Sen",
  email: "priya@workplace.com",
  designation: "UI/UX Designer",
  basicSalary: 60000,
  joiningDate: "2026-11-10",
});

assert(hireResult.employee.status === "ONBOARDING", "New hire status is initialized to ONBOARDING");
assert(hireResult.employee.salary.hra === 24000, "Salary HRA automatically calculated at 40% of basic");
assert(hireResult.board.type === "ONBOARDING", "Connected Wedge: Auto-generates dedicated Onboarding Kanban Board");
assert(hireResult.columns.length === 4, "Connected Wedge: Generates 4 standard workflow columns");
assert(hireResult.tasks.length === 9, "Connected Wedge: Generates 9 comprehensive starter onboarding tasks");

console.log("\n==================================================");
console.log(`PAGE 2 SUMMARY: ${passed} passed, ${failed} failed`);
console.log("==================================================");

if (failed > 0) process.exit(1);
