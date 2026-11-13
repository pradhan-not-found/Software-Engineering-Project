import type {
  Attendance,
  Board,
  BoardColumn,
  DB,
  Employee,
  Expense,
  Goal,
  Holiday,
  LeaveRequest,
  Notification,
  ActivityLog,
  PayrollRun,
  PermissionMatrix,
  Project,
  Review,
  ReviewCycle,
  Task,
  Timesheet,
  Role,
  ModuleKey,
} from "../types";
import { addDays, computePayrollLine, isWeekend, startOfWeek, today, toISODate, workingDays } from "../utils";

export const DB_VERSION = 3;

// Deterministic PRNG so the seeded demo looks the same on every reset.
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DEMO_PASSWORD = "demo1234";

export const DEMO_ACCOUNTS: { label: string; email: string; role: Role; description: string }[] = [
  { label: "Super Admin", email: "arjun@workplace.com", role: "SUPER_ADMIN", description: "Arjun Mehta · CEO" },
  { label: "HR Admin", email: "neha@workplace.com", role: "HR_ADMIN", description: "Neha Kapoor · HR Director" },
  { label: "Manager", email: "rohan@workplace.com", role: "MANAGER", description: "Rohan Sharma · Frontend Lead" },
  { label: "Employee", email: "ananya@workplace.com", role: "EMPLOYEE", description: "Ananya Verma · Product Designer" },
];

export function defaultColumns(prefix: string): BoardColumn[] {
  return [
    { id: `${prefix}_todo`, name: "To Do", category: "todo" },
    { id: `${prefix}_prog`, name: "In Progress", category: "in_progress" },
    { id: `${prefix}_rev`, name: "Under Review", category: "review" },
    { id: `${prefix}_done`, name: "Done", category: "done" },
  ];
}

export function defaultPermissions(): PermissionMatrix {
  const all = (v: boolean) =>
    ({
      directory: v, orgchart: v, access: v, leaves: v, attendance: v, payroll: v,
      expenses: v, performance: v, projects: v, onboarding: v,
    }) as Record<ModuleKey, boolean>;
  return {
    SUPER_ADMIN: all(true),
    HR_ADMIN: { ...all(true), access: false },
    MANAGER: { ...all(false), directory: true, orgchart: true, projects: true },
    EMPLOYEE: { ...all(false), directory: true, orgchart: true },
  };
}

type Seed = Omit<
  Employee,
  "documents" | "assets" | "password" | "accountStatus" | "emergencyContact" | "skills" | "certifications" |
  "address" | "dob" | "gender" | "bankAccount" | "pan" | "shift" | "location" | "workMode" | "phone" | "code" | "buddyId" | "salary"
> & { gender: Employee["gender"]; basic: number; skills: string[]; workMode?: Employee["workMode"] };

export function createSeed(): DB {
  const rand = mulberry32(42);
  const t = today();
  const year = new Date().getFullYear();
  const iso = (date: string, h = 9, m = 0) => {
    const d = new Date(`${date}T00:00:00`);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  const departments = [
    { id: "d_exec", name: "Executive", code: "EXE", headId: "e1", color: "indigo" },
    { id: "d_people", name: "People Operations", code: "HR", headId: "e2", color: "pink" },
    { id: "d_eng", name: "Engineering", code: "ENG", headId: "e3", color: "blue" },
    { id: "d_mkt", name: "Marketing", code: "MKT", headId: "e4", color: "orange" },
    { id: "d_design", name: "Design", code: "DSN", headId: "e7", color: "purple" },
    { id: "d_data", name: "Data & Analytics", code: "DAT", headId: "e9", color: "teal" },
    { id: "d_fin", name: "Finance", code: "FIN", headId: "e15", color: "green" },
  ];

  const people: Seed[] = [
    { id: "e1", firstName: "Arjun", lastName: "Mehta", email: "arjun@workplace.com", role: "SUPER_ADMIN", designation: "Chief Executive Officer", departmentId: "d_exec", managerId: null, joiningDate: "2019-04-01", status: "ACTIVE", gender: "Male", basic: 250000, skills: ["Strategy", "Leadership", "Fundraising"] },
    { id: "e2", firstName: "Neha", lastName: "Kapoor", email: "neha@workplace.com", role: "HR_ADMIN", designation: "HR Director", departmentId: "d_people", managerId: "e1", joiningDate: "2019-09-15", status: "ACTIVE", gender: "Female", basic: 140000, skills: ["Talent Acquisition", "Compliance", "L&D"] },
    { id: "e3", firstName: "Vikram", lastName: "Iyer", email: "vikram@workplace.com", role: "MANAGER", designation: "VP of Engineering", departmentId: "d_eng", managerId: "e1", joiningDate: "2020-01-06", status: "ACTIVE", gender: "Male", basic: 200000, skills: ["Architecture", "Go", "Kubernetes"] },
    { id: "e4", firstName: "Sarah", lastName: "Jenkins", email: "sarah@workplace.com", role: "MANAGER", designation: "VP of Marketing", departmentId: "d_mkt", managerId: "e1", joiningDate: "2020-06-01", status: "ACTIVE", gender: "Female", basic: 180000, skills: ["Brand", "Growth", "Content"] },
    { id: "e5", firstName: "Rohan", lastName: "Sharma", email: "rohan@workplace.com", role: "MANAGER", designation: "Frontend Lead", departmentId: "d_eng", managerId: "e3", joiningDate: "2021-02-15", status: "ACTIVE", gender: "Male", basic: 130000, skills: ["React", "Next.js", "TypeScript", "Design Systems"], workMode: "Hybrid" },
    { id: "e6", firstName: "Varun", lastName: "Nair", email: "varun@workplace.com", role: "EMPLOYEE", designation: "DevOps Engineer", departmentId: "d_eng", managerId: "e3", joiningDate: "2021-08-02", status: "ON_LEAVE", gender: "Male", basic: 95000, skills: ["AWS", "Terraform", "CI/CD"] },
    { id: "e7", firstName: "Ananya", lastName: "Verma", email: "ananya@workplace.com", role: "EMPLOYEE", designation: "Product Designer", departmentId: "d_design", managerId: "e5", joiningDate: "2022-03-14", status: "ACTIVE", gender: "Female", basic: 85000, skills: ["Figma", "UX Research", "Prototyping"], workMode: "Hybrid" },
    { id: "e8", firstName: "Robert", lastName: "Chen", email: "robert@workplace.com", role: "EMPLOYEE", designation: "Data Scientist", departmentId: "d_data", managerId: "e9", joiningDate: "2022-07-11", status: "ACTIVE", gender: "Male", basic: 105000, skills: ["Python", "ML", "SQL"], workMode: "Remote" },
    { id: "e9", firstName: "Ananya", lastName: "Ghosh", email: "ananya@workplace.com", role: "MANAGER", designation: "Head of Data", departmentId: "d_data", managerId: "e1", joiningDate: "2020-11-02", status: "ACTIVE", gender: "Female", basic: 160000, skills: ["Analytics", "BI", "Statistics"] },
    { id: "e10", firstName: "Rahul", lastName: "Verma", email: "rahul@workplace.com", role: "EMPLOYEE", designation: "Frontend Engineer", departmentId: "d_eng", managerId: "e5", joiningDate: "2023-01-09", status: "ACTIVE", gender: "Male", basic: 75000, skills: ["React", "CSS", "Testing"] },
    { id: "e11", firstName: "Kavya", lastName: "Nair", email: "kavya@workplace.com", role: "EMPLOYEE", designation: "Backend Engineer", departmentId: "d_eng", managerId: "e3", joiningDate: "2023-05-22", status: "ACTIVE", gender: "Female", basic: 82000, skills: ["Node.js", "PostgreSQL", "Prisma"] },
    { id: "e12", firstName: "Emily", lastName: "Watson", email: "emily@workplace.com", role: "EMPLOYEE", designation: "Content Strategist", departmentId: "d_mkt", managerId: "e4", joiningDate: "2023-09-04", status: "ACTIVE", gender: "Female", basic: 65000, skills: ["Copywriting", "SEO"] },
    { id: "e13", firstName: "Daniel", lastName: "Park", email: "daniel@workplace.com", role: "EMPLOYEE", designation: "Growth Marketer", departmentId: "d_mkt", managerId: "e4", joiningDate: "2024-02-12", status: "ACTIVE", gender: "Male", basic: 70000, skills: ["Paid Ads", "Analytics"] },
    { id: "e14", firstName: "Priya", lastName: "Sen", email: "priya@workplace.com", role: "HR_ADMIN", designation: "HR Executive", departmentId: "d_people", managerId: "e2", joiningDate: "2024-06-03", status: "ACTIVE", gender: "Female", basic: 55000, skills: ["Onboarding", "Payroll Ops"] },
    { id: "e15", firstName: "Aman", lastName: "Gupta", email: "aman@workplace.com", role: "MANAGER", designation: "Finance Manager", departmentId: "d_fin", managerId: "e1", joiningDate: "2020-03-16", status: "ACTIVE", gender: "Male", basic: 120000, skills: ["Accounting", "Tax", "FP&A"] },
    { id: "e16", firstName: "Sneha", lastName: "Roy", email: "sneha@workplace.com", role: "EMPLOYEE", designation: "QA Engineer", departmentId: "d_eng", managerId: "e5", joiningDate: addDays(t, -3), status: "ONBOARDING", gender: "Female", basic: 60000, skills: ["Playwright", "Manual Testing"] },
    { id: "e17", firstName: "Karan", lastName: "Malhotra", email: "karan@workplace.com", role: "EMPLOYEE", designation: "Accountant", departmentId: "d_fin", managerId: "e15", joiningDate: "2022-10-10", status: "OFFBOARDING", gender: "Male", basic: 58000, skills: ["Tally", "GST"] },
    { id: "e18", firstName: "Soubhik", lastName: "Dutta", email: "soubhik@workplace.com", role: "EMPLOYEE", designation: "Associate Marketing Specialist", departmentId: "d_mkt", managerId: "e4", joiningDate: "2024-10-01", status: "ACTIVE", gender: "Male", basic: 62000, skills: ["SEO", "Content Strategy", "Social Media Analytics"] },
  ];

  const cities = ["Kolkata", "Bengaluru", "Mumbai", "Pune", "Hyderabad", "Delhi"];
  const employees: Employee[] = people.map((p, i) => {
    const { basic, ...rest } = p;
    return {
      ...rest,
      code: `WP-${String(1001 + i)}`,
      password: DEMO_PASSWORD,
      phone: `+91 98${String(30000000 + Math.floor(rand() * 69999999)).slice(0, 8)}`,
      accountStatus: "ACTIVE",
      buddyId: p.id === "e16" ? "e10" : null,
      location: cities[i % cities.length],
      workMode: p.workMode ?? "Onsite",
      shift: i % 5 === 4 ? "Late (12:00 – 21:00)" : "General (09:00 – 18:00)",
      dob: `${1985 + (i % 14)}-${String((i % 12) + 1).padStart(2, "0")}-${String((i * 3) % 27 + 1).padStart(2, "0")}`,
      address: `${12 + i * 7}, ${["Park Street", "MG Road", "Salt Lake Sector V", "Koramangala", "Banjara Hills", "Baner Road"][i % 6]}, ${cities[i % cities.length]}`,
      emergencyContact: { name: `${["Rita", "Amit", "Sunita", "Rohan", "Meera"][i % 5]} ${p.lastName}`, relation: ["Spouse", "Parent", "Sibling"][i % 3], phone: `+91 97${String(40000000 + i * 1234567).slice(0, 8)}` },
      certifications: i % 3 === 0 ? ["AWS Certified Cloud Practitioner"] : i % 3 === 1 ? ["Scrum Fundamentals"] : [],
      documents: [
        { id: `doc_${p.id}_1`, name: "Signed Offer Letter.pdf", type: "Offer Letter", uploadedAt: p.joiningDate, verified: true },
        { id: `doc_${p.id}_2`, name: "Aadhaar Card.pdf", type: "ID Proof", uploadedAt: p.joiningDate, verified: p.status !== "ONBOARDING" },
        ...(p.status === "ONBOARDING" ? [] : [{ id: `doc_${p.id}_3`, name: "Degree Certificate.pdf", type: "Education" as const, uploadedAt: p.joiningDate, verified: true }]),
      ],
      assets: [
        { id: `as_${p.id}_1`, type: "Laptop", tag: `LT-${2000 + i}`, assignedAt: p.joiningDate, returned: false },
        { id: `as_${p.id}_2`, type: "ID Card", tag: `ID-${5000 + i}`, assignedAt: p.joiningDate, returned: p.id === "e17" },
        ...(i % 2 === 0 ? [{ id: `as_${p.id}_3`, type: "Access Card" as const, tag: `AC-${7000 + i}`, assignedAt: p.joiningDate, returned: false }] : []),
      ],
      salary: {
        basic,
        hra: Math.round(basic * 0.4),
        allowances: Math.round(basic * 0.2),
        otherDeductions: 0,
        effectiveDate: `${year}-04-01`,
      },
      bankAccount: `XXXX XXXX ${String(4000 + i * 37).slice(0, 4)}`,
      pan: `ABCPM${String(1000 + i * 13).slice(0, 4)}K`,
    };
  });

  /* ------------------------------ Holidays ------------------------------ */
  const holidays: Holiday[] = [
    { id: "h1", date: `${year}-01-01`, name: "New Year's Day", type: "Company" },
    { id: "h2", date: `${year}-01-26`, name: "Republic Day", type: "National" },
    { id: "h3", date: `${year}-03-04`, name: "Holi", type: "National" },
    { id: "h4", date: `${year}-04-14`, name: "Bengali New Year", type: "Regional" },
    { id: "h5", date: `${year}-05-01`, name: "May Day", type: "Regional" },
    { id: "h6", date: `${year}-08-15`, name: "Independence Day", type: "National" },
    { id: "h7", date: `${year}-10-02`, name: "Gandhi Jayanti", type: "National" },
    { id: "h8", date: `${year}-10-19`, name: "Durga Puja (Dashami)", type: "Regional" },
    { id: "h9", date: `${year}-11-08`, name: "Diwali", type: "National" },
    { id: "h10", date: `${year}-11-24`, name: "Workplace Foundation Day", type: "Company" },
    { id: "h11", date: `${year}-12-25`, name: "Christmas", type: "National" },
  ];
  const holidayDates = holidays.map((h) => h.date);

  /* ------------------------------ Leaves -------------------------------- */
  const mkLeave = (id: string, employeeId: string, type: LeaveRequest["type"], start: string, end: string, status: LeaveRequest["status"], reason: string, approverId: string | null, createdOffset = -5): LeaveRequest => ({
    id, employeeId, type, startDate: start, endDate: end,
    days: Math.max(1, workingDays(start, end, holidayDates)),
    reason, status, approverId,
    createdAt: iso(addDays(t, createdOffset), 10, 30),
    decidedAt: status === "PENDING" ? undefined : iso(addDays(t, createdOffset + 1), 11),
    decisionComment: status === "REJECTED" ? "Release week — please reschedule." : undefined,
  });
  const leaves: LeaveRequest[] = [
    mkLeave("l1", "e6", "ANNUAL", addDays(t, -2), addDays(t, 4), "APPROVED", "Family wedding in Jaipur", "e3", -10),
    mkLeave("l2", "e10", "ANNUAL", addDays(t, 7), addDays(t, 9), "PENDING", "Short vacation trip", null, -1),
    mkLeave("l3", "e12", "SICK", addDays(t, 1), addDays(t, 1), "PENDING", "Doctor appointment", null, 0),
    mkLeave("l4", "e11", "CASUAL", addDays(t, 3), addDays(t, 3), "PENDING", "Personal errand", null, -2),
    mkLeave("l5", "e7", "ANNUAL", addDays(t, -40), addDays(t, -38), "APPROVED", "Trip to Darjeeling", "e5", -50),
    mkLeave("l6", "e7", "SICK", addDays(t, -20), addDays(t, -20), "APPROVED", "Fever", "e5", -20),
    mkLeave("l7", "e5", "CASUAL", addDays(t, -12), addDays(t, -12), "APPROVED", "Bank work", "e3", -15),
    mkLeave("l8", "e13", "ANNUAL", addDays(t, -6), addDays(t, -5), "REJECTED", "Weekend extension", "e4", -9),
    mkLeave("l9", "e7", "CASUAL", addDays(t, 14), addDays(t, 14), "PENDING", "Sister's graduation", null, -1),
    mkLeave("l10", "e8", "ANNUAL", addDays(t, 20), addDays(t, 24), "APPROVED", "Visiting parents", "e9", -7),
  ];

  /* ----------------------------- Attendance ----------------------------- */
  const attendance: Attendance[] = [];
  for (const e of employees) {
    for (let back = 45; back >= 0; back--) {
      const date = addDays(t, -back);
      if (date < e.joiningDate || isWeekend(date) || holidayDates.includes(date)) continue;
      if (e.status === "TERMINATED") continue;
      const onLeave = leaves.some((l) => l.employeeId === e.id && l.status === "APPROVED" && l.startDate <= date && l.endDate >= date);
      if (back === 0) {
        // Today: most people have clocked in already; demo users clock in themselves.
        if (["e5", "e7", "e1", "e2"].includes(e.id) || onLeave) {
          if (onLeave) attendance.push({ id: `att_${e.id}_${date}`, employeeId: e.id, date, clockIn: null, clockOut: null, status: "ON_LEAVE" });
          continue;
        }
        const mins = Math.floor(rand() * 50);
        attendance.push({ id: `att_${e.id}_${date}`, employeeId: e.id, date, clockIn: iso(date, 9, mins), clockOut: null, status: e.workMode === "Remote" ? "REMOTE" : "PRESENT" });
        continue;
      }
      if (onLeave) {
        attendance.push({ id: `att_${e.id}_${date}`, employeeId: e.id, date, clockIn: null, clockOut: null, status: "ON_LEAVE" });
        continue;
      }
      const r = rand();
      const status: Attendance["status"] = r < 0.03 ? "ABSENT" : r < 0.07 ? "HALF_DAY" : e.workMode === "Remote" || (e.workMode === "Hybrid" && r < 0.4) ? "REMOTE" : "PRESENT";
      const inMin = Math.floor(rand() * 55);
      const outH = status === "HALF_DAY" ? 13 : 17 + Math.floor(rand() * 3);
      attendance.push({
        id: `att_${e.id}_${date}`, employeeId: e.id, date,
        clockIn: status === "ABSENT" ? null : iso(date, 9, inMin),
        clockOut: status === "ABSENT" ? null : iso(date, outH, Math.floor(rand() * 59)),
        status,
      });
    }
  }

  /* ------------------------- Projects & Boards -------------------------- */
  const projects: Project[] = [
    { id: "p1", name: "Workplace Web Platform", description: "Next.js frontend for the unified HR + work platform.", departmentId: "d_eng", leadId: "e5", status: "ACTIVE", color: "blue", startDate: addDays(t, -120), endDate: addDays(t, 60) },
    { id: "p2", name: "Infra Migration to Kubernetes", description: "Move all services from VMs to a managed K8s cluster.", departmentId: "d_eng", leadId: "e3", status: "ACTIVE", color: "teal", startDate: addDays(t, -90), endDate: addDays(t, 30) },
    { id: "p3", name: "Q4 Brand Campaign", description: "Festive-season brand refresh across web and social.", departmentId: "d_mkt", leadId: "e4", status: "ACTIVE", color: "orange", startDate: addDays(t, -45), endDate: addDays(t, 40) },
    { id: "p4", name: "Attrition Analytics", description: "Predictive model and dashboard for employee attrition.", departmentId: "d_data", leadId: "e9", status: "PLANNING", color: "purple", startDate: addDays(t, -10), endDate: addDays(t, 90) },
  ];
  const boards: Board[] = projects.map((p) => ({
    id: `b_${p.id}`, title: p.name, type: "PROJECT", projectId: p.id, ownerId: null,
    columns: defaultColumns(`b_${p.id}`), createdAt: iso(p.startDate),
  }));
  // Onboarding board for the new hire (auto-generated in the real flow).
  boards.push({
    id: "b_onb_e16", title: "Onboarding · Sneha Roy", type: "ONBOARDING", projectId: null, ownerId: "e16",
    columns: defaultColumns("b_onb_e16"), createdAt: iso(addDays(t, -3)),
  });

  let order = 0;
  const tasks: Task[] = [];
  const col = (boardId: string, cat: "todo" | "prog" | "rev" | "done") => `${boardId}_${cat}`;
  const mkTask = (
    boardId: string, cat: "todo" | "prog" | "rev" | "done", title: string, assigneeIds: string[], creatorId: string,
    priority: Task["priority"], dueOffset: number | null, opts: Partial<Task> & { doneOffset?: number } = {},
  ) => {
    const { doneOffset, ...rest } = opts;
    const due = dueOffset === null ? null : addDays(t, dueOffset);
    tasks.push({
      id: `t${tasks.length + 1}`, boardId, columnId: col(boardId, cat), title, description: rest.description ?? "",
      priority, dueDate: due, assigneeIds, creatorId, flag: "NORMAL", recurrence: "NONE", tags: [],
      comments: [], attachments: [], createdAt: iso(addDays(t, (dueOffset ?? 0) - 14)),
      completedAt: cat === "done" ? iso(addDays(t, doneOffset ?? (dueOffset ?? 0) - 1), 16) : null,
      order: order++, ...rest,
    });
  };

  // Workplace Web Platform
  mkTask("b_p1", "todo", "Build payroll payslip PDF export", ["e10"], "e5", "HIGH", 5, { description: "Generate downloadable payslips from the payroll run.", tags: ["payroll"] });
  mkTask("b_p1", "prog", "Design system audit", ["e7"], "e5", "MEDIUM", 2, { description: "Check for inconsistencies in the component library across the new dashboard.", tags: ["design"] });
  mkTask("b_p1", "prog", "Kanban drag-and-drop polish", ["e5", "e10"], "e5", "MEDIUM", 6, { tags: ["ux"] });
  mkTask("b_p1", "rev", "Leave request form validation", ["e10"], "e5", "HIGH", 0, { tags: ["leaves"], comments: [{ id: "c1", authorId: "e5", text: "Looks good, just handle half-day edge case.", at: iso(addDays(t, -1), 15) }] });
  mkTask("b_p1", "todo", "Dark mode contrast fixes", ["e7"], "e5", "LOW", 10);
  mkTask("b_p1", "todo", "Review Q3 payroll reports UI", ["e5"], "e3", "URGENT", -1, { description: "Ensure all reimbursements are visible before end of quarter." });
  mkTask("b_p1", "done", "Org chart component", ["e5"], "e5", "HIGH", -8, { doneOffset: -9 });
  mkTask("b_p1", "done", "Employee directory filters", ["e10"], "e5", "MEDIUM", -15, { doneOffset: -14 });
  mkTask("b_p1", "done", "Onboarding wizard mockups", ["e7"], "e5", "HIGH", -20, { doneOffset: -22 });
  mkTask("b_p1", "done", "Notification center UX", ["e7"], "e5", "MEDIUM", -30, { doneOffset: -28 });
  mkTask("b_p1", "done", "Auth pages responsive layout", ["e10"], "e5", "LOW", -35, { doneOffset: -36 });
  mkTask("b_p1", "done", "Profile page wireframes", ["e7"], "e5", "LOW", -50, { doneOffset: -51 });
  mkTask("b_p1", "done", "Theme switcher", ["e5"], "e5", "LOW", -60, { doneOffset: -61 });
  mkTask("b_p1", "todo", "Write E2E tests for leave flow", ["e16"], "e5", "MEDIUM", 12, { tags: ["qa"] });

  // Infra migration
  mkTask("b_p2", "prog", "Migrate auth service to K8s", ["e6"], "e3", "HIGH", 1, { flag: "DELAYED_ON_LEAVE" });
  mkTask("b_p2", "todo", "Set up Prometheus alerting", ["e6"], "e3", "MEDIUM", 4, { flag: "DELAYED_ON_LEAVE" });
  mkTask("b_p2", "prog", "Postgres connection pooling (PgBouncer)", ["e11"], "e3", "HIGH", 3);
  mkTask("b_p2", "todo", "Prisma migration pipeline in CI", ["e11"], "e3", "MEDIUM", 9);
  mkTask("b_p2", "done", "Terraform base modules", ["e6"], "e3", "HIGH", -18, { doneOffset: -16 });
  mkTask("b_p2", "done", "Helm charts for API", ["e11"], "e3", "MEDIUM", -10, { doneOffset: -11 });
  mkTask("b_p2", "done", "Staging cluster provisioning", ["e6"], "e3", "URGENT", -25, { doneOffset: -26 });

  // Brand campaign
  mkTask("b_p3", "prog", "Festive landing page copy", ["e12"], "e4", "HIGH", 2);
  mkTask("b_p3", "todo", "Paid social campaign setup", ["e13"], "e4", "MEDIUM", 6);
  mkTask("b_p3", "rev", "Campaign visual assets", ["e7", "e12"], "e4", "HIGH", 1);
  mkTask("b_p3", "done", "Campaign brief", ["e4"], "e4", "MEDIUM", -20, { doneOffset: -21 });
  mkTask("b_p3", "done", "Competitor teardown", ["e13"], "e4", "LOW", -12, { doneOffset: -10 });

  // Attrition analytics
  mkTask("b_p4", "todo", "Define attrition features", ["e8"], "e9", "MEDIUM", 8);
  mkTask("b_p4", "prog", "Clean historical HR dataset", ["e8"], "e9", "HIGH", 3);
  mkTask("b_p4", "done", "Stakeholder interviews", ["e9"], "e9", "MEDIUM", -6, { doneOffset: -7 });

  // Onboarding board for Sneha (connected wedge: auto-generated)
  mkTask("b_onb_e16", "done", "[IT] Provision laptop & accounts", ["e14"], "e2", "HIGH", -3, { tags: ["IT"], doneOffset: -3 });
  mkTask("b_onb_e16", "done", "[Employee] Upload ID & address proof", ["e16"], "e2", "HIGH", -1, { tags: ["Employee"], doneOffset: -2 });
  mkTask("b_onb_e16", "prog", "[Buddy] Walkthrough of codebase & tools", ["e10"], "e2", "MEDIUM", 2, { tags: ["Buddy"] });
  mkTask("b_onb_e16", "todo", "[Manager] 30-60-90 day plan", ["e5"], "e2", "HIGH", 4, { tags: ["Manager"] });
  mkTask("b_onb_e16", "todo", "[Employee] Complete compliance training", ["e16"], "e2", "MEDIUM", 7, { tags: ["Employee"] });
  mkTask("b_onb_e16", "todo", "[HR] Verify documents & activate payroll", ["e14"], "e2", "HIGH", 3, { tags: ["HR"] });

  // Personal to-dos
  boards.push(
    { id: "b_personal_e7", title: "Ananya's To-Dos", type: "PERSONAL", projectId: null, ownerId: "e7", columns: defaultColumns("b_personal_e7"), createdAt: iso(addDays(t, -30)) },
    { id: "b_personal_e5", title: "Rohan's To-Dos", type: "PERSONAL", projectId: null, ownerId: "e5", columns: defaultColumns("b_personal_e5"), createdAt: iso(addDays(t, -30)) },
  );
  mkTask("b_personal_e7", "todo", "Daily stand-up notes", ["e7"], "e7", "LOW", 0, { recurrence: "DAILY" });
  mkTask("b_personal_e7", "todo", "Submit weekly timesheet", ["e7"], "e7", "MEDIUM", 2, { recurrence: "WEEKLY" });
  mkTask("b_personal_e5", "todo", "1:1 with Rahul", ["e5"], "e5", "MEDIUM", 1, { recurrence: "WEEKLY" });
  mkTask("b_personal_e5", "todo", "Approve team timesheets", ["e5"], "e5", "HIGH", 0, { recurrence: "WEEKLY" });

  /* ------------------------------ Expenses ------------------------------ */
  const expenses: Expense[] = [
    { id: "x1", employeeId: "e7", category: "Equipment", amount: 4500, date: addDays(t, -6), description: "Wacom drawing tablet", receiptName: "wacom-invoice.pdf", status: "PENDING", createdAt: iso(addDays(t, -5)) },
    { id: "x2", employeeId: "e10", category: "Internet", amount: 1200, date: addDays(t, -10), description: "Monthly broadband (WFH)", receiptName: "airtel-bill.pdf", status: "APPROVED", decidedBy: "e2", createdAt: iso(addDays(t, -9)) },
    { id: "x3", employeeId: "e12", category: "Travel", amount: 8600, date: addDays(t, -15), description: "Client shoot travel – Mumbai", receiptName: "flight.pdf", status: "PENDING", createdAt: iso(addDays(t, -14)) },
    { id: "x4", employeeId: "e5", category: "Training", amount: 15000, date: addDays(t, -40), description: "React Summit ticket", receiptName: "ticket.pdf", status: "REIMBURSED", decidedBy: "e2", createdAt: iso(addDays(t, -39)) },
    { id: "x5", employeeId: "e13", category: "Meals", amount: 2300, date: addDays(t, -3), description: "Team lunch with agency", receiptName: null, status: "PENDING", createdAt: iso(addDays(t, -2)) },
    { id: "x6", employeeId: "e8", category: "Other", amount: 999, date: addDays(t, -25), description: "Dataset subscription", receiptName: "invoice.pdf", status: "REJECTED", decidedBy: "e2", createdAt: iso(addDays(t, -24)) },
  ];

  /* ------------------------------ Payroll ------------------------------- */
  const now = new Date();
  const monthStr = (offset: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const payrollEmployees = employees.filter((e) => e.status !== "ONBOARDING");
  const payrollRuns: PayrollRun[] = [-2, -1].map((off) => {
    const m = monthStr(off);
    return {
      id: `pr_${m}`, month: m, status: "PAID",
      createdAt: iso(`${m}-26`), processedAt: iso(`${m}-27`), paidAt: iso(`${m}-28`),
      expenseIds: [],
      lines: payrollEmployees.map((e) => computePayrollLine(e, { reimbursements: e.id === "e5" && off === -1 ? 15000 : 0 })),
    };
  });

  /* ------------------------------ Performance --------------------------- */
  const q = `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;
  const goals: Goal[] = [
    { id: "g1", employeeId: "e7", title: "Ship v2 design system", type: "OKR", quarter: q, progress: 65, status: "ON_TRACK", keyResults: [
      { id: "kr1", label: "Audit 100% of components", done: true },
      { id: "kr2", label: "Publish tokens to Figma library", done: true },
      { id: "kr3", label: "Migrate 3 core pages", done: false },
    ] },
    { id: "g2", employeeId: "e7", title: "Run 6 usability studies", type: "KPI", quarter: q, progress: 33, status: "AT_RISK", keyResults: [] },
    { id: "g3", employeeId: "e5", title: "Reduce frontend bundle size by 25%", type: "OKR", quarter: q, progress: 80, status: "ON_TRACK", keyResults: [
      { id: "kr4", label: "Code-split admin routes", done: true },
      { id: "kr5", label: "Remove unused dependencies", done: true },
      { id: "kr6", label: "Image optimisation pass", done: false },
    ] },
    { id: "g4", employeeId: "e10", title: "Increase test coverage to 70%", type: "KPI", quarter: q, progress: 45, status: "BEHIND", keyResults: [] },
    { id: "g5", employeeId: "e6", title: "Zero-downtime K8s cut-over", type: "OKR", quarter: q, progress: 55, status: "AT_RISK", keyResults: [] },
    { id: "g6", employeeId: "e12", title: "Publish 12 long-form articles", type: "KPI", quarter: q, progress: 75, status: "ON_TRACK", keyResults: [] },
    { id: "g7", employeeId: "e8", title: "Attrition model AUC > 0.8", type: "OKR", quarter: q, progress: 20, status: "ON_TRACK", keyResults: [] },
  ];

  const cycles: ReviewCycle[] = [
    { id: "rc1", name: `H1 ${year} Review`, startDate: `${year}-01-01`, endDate: `${year}-06-30`, status: "CLOSED" },
    { id: "rc2", name: `H2 ${year} Review`, startDate: addDays(t, -90), endDate: addDays(t, 20), status: "ACTIVE" },
  ];
  const reviewable = employees.filter((e) => e.managerId && e.status !== "ONBOARDING" && e.status !== "TERMINATED");
  const reviews: Review[] = [];
  reviewable.forEach((e, i) => {
    reviews.push({
      id: `rv1_${e.id}`, cycleId: "rc1", employeeId: e.id, reviewerId: e.managerId,
      selfRating: 3 + (i % 3), selfComment: "Delivered all planned work for the half.",
      peerFeedback: [], managerRating: 3 + ((i + 1) % 3), managerComment: "Solid contributor, keep it up.", status: "COMPLETED",
    });
    const stage = i % 3;
    reviews.push({
      id: `rv2_${e.id}`, cycleId: "rc2", employeeId: e.id, reviewerId: e.managerId,
      selfRating: stage === 0 ? null : 4, selfComment: stage === 0 ? "" : "Focused on shipping core flows and mentoring juniors.",
      peerFeedback: stage === 2 ? [{ fromId: e.managerId === "e5" ? "e10" : "e5", rating: 4, comment: "Great collaborator, always unblocks others." }] : [],
      managerRating: stage === 2 ? 4 : null, managerComment: stage === 2 ? "Exceeded expectations on delivery." : "",
      status: stage === 0 ? "PENDING_SELF" : stage === 1 ? "PENDING_MANAGER" : "COMPLETED",
    });
  });
  // Make sure demo employee Ananya has a pending self review.
  const ananyaRv = reviews.find((r) => r.id === "rv2_e7");
  if (ananyaRv) Object.assign(ananyaRv, { selfRating: null, selfComment: "", managerRating: null, managerComment: "", peerFeedback: [], status: "PENDING_SELF" });

  /* ------------------------------ Timesheets ---------------------------- */
  const lastWeek = startOfWeek(addDays(t, -7));
  const timesheets: Timesheet[] = [
    { id: "ts1", employeeId: "e10", weekStart: lastWeek, entries: [{ projectId: "p1", hours: [8, 8, 7, 8, 8, 0, 0] }], status: "SUBMITTED", submittedAt: iso(addDays(lastWeek, 5)) },
    { id: "ts2", employeeId: "e7", weekStart: lastWeek, entries: [{ projectId: "p1", hours: [6, 6, 5, 6, 6, 0, 0] }, { projectId: "p3", hours: [2, 2, 3, 2, 2, 0, 0] }], status: "APPROVED", submittedAt: iso(addDays(lastWeek, 5)), decidedBy: "e5" },
    { id: "ts3", employeeId: "e11", weekStart: lastWeek, entries: [{ projectId: "p2", hours: [8, 9, 8, 8, 7, 0, 0] }], status: "SUBMITTED", submittedAt: iso(addDays(lastWeek, 5)) },
    { id: "ts4", employeeId: "e12", weekStart: lastWeek, entries: [{ projectId: "p3", hours: [8, 8, 8, 8, 6, 0, 0] }], status: "SUBMITTED", submittedAt: iso(addDays(lastWeek, 5)) },
  ];

  /* ------------------------ Notifications & activity -------------------- */
  const n = (id: string, recipientId: string, title: string, message: string, category: Notification["category"], hoursAgo: number, link: string | null = null, read = false): Notification => ({
    id, recipientId, title, message, category, read, link, createdAt: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
  });
  const notifications: Notification[] = [
    n("n1", "e7", "Task assigned", "Rohan Sharma assigned you to “Design system audit”.", "WORK", 20, "/employee/tasks"),
    n("n2", "e7", "Leave approved", "Your sick leave was approved by Rohan Sharma.", "HR", 24 * 20, "/employee/leaves", true),
    n("n3", "e7", "Review cycle started", `H2 ${year} Review is open — submit your self-assessment.`, "HR", 30, "/employee/performance"),
    n("n4", "e5", "Leave request", "Rahul Verma requested 3 days of Annual Leave.", "HR", 22, "/employee/team"),
    n("n5", "e5", "New joiner", "Sneha Roy joined your team. Onboarding board created.", "HR", 72, "/employee/tasks"),
    n("n6", "e5", "Deadline near", "“Leave request form validation” is due today.", "WORK", 5, "/employee/tasks"),
    n("n7", "e3", "Tasks delayed", "Varun Nair is on leave — 2 active tasks flagged “Delayed — On Leave”.", "WORK", 48, "/admin/projects"),
    n("n8", "e2", "Pending approvals", "3 leave requests and 3 expense claims are waiting for review.", "HR", 3, "/admin/leaves"),
    n("n9", "e1", "Payroll ready", `Payroll for ${monthStr(0)} can now be generated.`, "SYSTEM", 6, "/admin/payroll"),
    n("n10", "e2", "Offboarding", "Karan Malhotra's exit checklist is 2/6 complete.", "HR", 26, "/admin/onboarding"),
  ];

  const a = (id: string, actorId: string | null, action: ActivityLog["action"], entity: string, message: string, category: ActivityLog["category"], hoursAgo: number): ActivityLog => ({
    id, actorId, action, entity, message, category, at: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
  });
  const activity: ActivityLog[] = [
    a("a1", "e12", "CREATE", "LeaveRequest", "Emily Watson requested 1 day of Sick Leave.", "HR", 2),
    a("a2", "e13", "CREATE", "Expense", "Daniel Park submitted an expense claim of ₹2,300.", "HR", 48),
    a("a3", "e10", "CREATE", "LeaveRequest", "Rahul Verma requested 3 days of Annual Leave.", "HR", 22),
    a("a4", null, "SYSTEM", "Task", "2 tasks assigned to Varun Nair flagged “Delayed — On Leave”.", "WORK", 240),
    a("a5", "e3", "APPROVE", "LeaveRequest", "Vikram Iyer approved Varun Nair's Annual Leave.", "HR", 240),
    a("a6", null, "SYSTEM", "Board", "Onboarding board auto-generated for Sneha Roy (6 tasks).", "WORK", 72),
    a("a7", "e2", "CREATE", "Employee", "Neha Kapoor added Sneha Roy (QA Engineer) to Engineering.", "HR", 72),
    a("a8", "e2", "UPDATE", "Employee", "Neha Kapoor initiated offboarding for Karan Malhotra.", "HR", 26),
    a("a9", "e5", "UPDATE", "Task", "Rohan Sharma moved “Org chart component” to Done.", "WORK", 200),
    a("a10", "e1", "UPDATE", "PayrollRun", `Arjun Mehta marked payroll for ${monthStr(-1)} as paid.`, "SYSTEM", 24 * 8),
  ];

  // Offboarding + onboarding details
  const karan = employees.find((e) => e.id === "e17")!;
  karan.offboarding = {
    lastWorkingDay: addDays(t, 10),
    reason: "Resignation — pursuing higher studies",
    initiatedAt: iso(addDays(t, -1)),
    checklist: [
      { id: "ob1", label: "Resignation accepted", done: true },
      { id: "ob2", label: "Knowledge transfer completed", done: true },
      { id: "ob3", label: "Laptop & access card returned", done: false },
      { id: "ob4", label: "System access revoked", done: false },
      { id: "ob5", label: "Exit interview", done: false },
      { id: "ob6", label: "Full & final settlement", done: false },
    ],
    settlementStatus: "PENDING",
    settlementAmount: 0,
  };
  const sneha = employees.find((e) => e.id === "e16")!;
  sneha.onboarding = {
    boardId: "b_onb_e16",
    offerLetterStatus: "ACCEPTED",
    welcomeEmailSent: true,
    documentsRequired: [
      { id: "dr1", label: "Signed offer letter", done: true },
      { id: "dr2", label: "Government ID proof", done: true },
      { id: "dr3", label: "Address proof", done: false },
      { id: "dr4", label: "Education certificates", done: false },
      { id: "dr5", label: "Bank account details", done: false },
    ],
  };

  return {
    version: DB_VERSION,
    org: { name: "Workplace Technologies", currency: "INR", workWeek: [1, 2, 3, 4, 5] },
    departments,
    employees,
    attendance,
    timesheets,
    leaves,
    holidays,
    projects,
    boards,
    tasks,
    expenses,
    payrollRuns,
    goals,
    cycles,
    reviews,
    notifications,
    activity,
    permissions: defaultPermissions(),
  };
}

export { toISODate };
