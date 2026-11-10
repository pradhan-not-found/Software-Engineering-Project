// Domain model for the Workplace EMS frontend.
// Mirrors the entities described in src/database_planning.md so the UI can be
// wired to the Prisma/PostgreSQL backend later without reshaping data.

export type Role = "SUPER_ADMIN" | "HR_ADMIN" | "MANAGER" | "EMPLOYEE";
export type EmployeeStatus = "ACTIVE" | "ONBOARDING" | "ON_LEAVE" | "OFFBOARDING" | "TERMINATED";
export type AccountStatus = "ACTIVE" | "SUSPENDED";

export interface Department {
  id: string;
  name: string;
  code: string;
  headId: string | null;
  color: string; // tailwind color name e.g. "blue"
}

export interface EmployeeDocument {
  id: string;
  name: string;
  type: "Offer Letter" | "ID Proof" | "Address Proof" | "Education" | "Certification" | "Contract" | "Other";
  uploadedAt: string;
  verified: boolean;
}

export interface Asset {
  id: string;
  type: "Laptop" | "ID Card" | "Access Card" | "Monitor" | "Phone" | "Headset";
  tag: string;
  assignedAt: string;
  returned: boolean;
}

export interface SalaryStructure {
  basic: number; // monthly
  hra: number;
  allowances: number;
  otherDeductions: number;
  effectiveDate: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface Offboarding {
  lastWorkingDay: string;
  reason: string;
  initiatedAt: string;
  checklist: ChecklistItem[];
  settlementStatus: "PENDING" | "PROCESSED";
  settlementAmount: number;
}

export interface Onboarding {
  boardId: string;
  offerLetterStatus: "DRAFT" | "SENT" | "ACCEPTED";
  documentsRequired: ChecklistItem[];
  welcomeEmailSent: boolean;
}

export interface Employee {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string; // demo-only; replaced by hashed auth on the backend
  phone: string;
  role: Role;
  accountStatus: AccountStatus;
  designation: string;
  departmentId: string;
  managerId: string | null;
  buddyId: string | null;
  joiningDate: string;
  status: EmployeeStatus;
  location: string;
  workMode: "Onsite" | "Hybrid" | "Remote";
  shift: string;
  dob: string;
  gender: "Male" | "Female" | "Other";
  address: string;
  emergencyContact: { name: string; relation: string; phone: string };
  skills: string[];
  certifications: string[];
  documents: EmployeeDocument[];
  assets: Asset[];
  salary: SalaryStructure;
  bankAccount: string;
  pan: string;
  onboarding?: Onboarding;
  offboarding?: Offboarding;
}

export type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY" | "REMOTE" | "ON_LEAVE";
export interface Attendance {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  clockIn: string | null; // ISO
  clockOut: string | null;
  status: AttendanceStatus;
}

export type TimesheetStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
export interface Timesheet {
  id: string;
  employeeId: string;
  weekStart: string; // Monday YYYY-MM-DD
  entries: { projectId: string; hours: number[] }[]; // 7 days
  status: TimesheetStatus;
  submittedAt?: string;
  decidedBy?: string;
}

export type LeaveTypeKey = "ANNUAL" | "SICK" | "CASUAL" | "PARENTAL" | "UNPAID";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveTypeKey;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  approverId: string | null;
  decisionComment?: string;
  createdAt: string;
  decidedAt?: string;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  type: "National" | "Regional" | "Company";
}

export interface Project {
  id: string;
  name: string;
  description: string;
  departmentId: string;
  leadId: string;
  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED";
  color: string;
  startDate: string;
  endDate: string;
}

export type ColumnCategory = "todo" | "in_progress" | "review" | "done";
export interface BoardColumn {
  id: string;
  name: string;
  category: ColumnCategory;
}

export type BoardType = "PROJECT" | "ONBOARDING" | "PERSONAL";
export interface Board {
  id: string;
  title: string;
  type: BoardType;
  projectId: string | null;
  ownerId: string | null; // personal board owner / onboarding subject
  columns: BoardColumn[];
  createdAt: string;
}

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskFlag = "NORMAL" | "DELAYED_ON_LEAVE" | "BLOCKED";
export type Recurrence = "NONE" | "DAILY" | "WEEKLY";

export interface TaskComment {
  id: string;
  authorId: string;
  text: string;
  at: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  size: number;
  uploadedBy: string;
  at: string;
}

export interface Task {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description: string;
  priority: Priority;
  dueDate: string | null;
  assigneeIds: string[];
  creatorId: string;
  flag: TaskFlag;
  recurrence: Recurrence;
  tags: string[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
  createdAt: string;
  completedAt: string | null;
  order: number;
}

export type ExpenseStatus = "PENDING" | "APPROVED" | "REJECTED" | "REIMBURSED";
export interface Expense {
  id: string;
  employeeId: string;
  category: "Travel" | "Meals" | "Equipment" | "Internet" | "Training" | "Other";
  amount: number;
  date: string;
  description: string;
  receiptName: string | null;
  status: ExpenseStatus;
  decidedBy?: string;
  createdAt: string;
}

export interface PayrollLine {
  employeeId: string;
  basic: number;
  hra: number;
  allowances: number;
  reimbursements: number;
  gross: number;
  pf: number;
  professionalTax: number;
  incomeTax: number;
  lopDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  net: number;
  lopDays: number;
}

export interface PayrollRun {
  id: string;
  month: string; // YYYY-MM
  status: "DRAFT" | "PROCESSED" | "PAID";
  createdAt: string;
  processedAt?: string;
  paidAt?: string;
  lines: PayrollLine[];
  expenseIds: string[]; // approved claims bundled into this run
}

export interface Goal {
  id: string;
  employeeId: string;
  title: string;
  type: "OKR" | "KPI";
  quarter: string; // e.g. "Q4 2026"
  progress: number; // 0-100
  status: "ON_TRACK" | "AT_RISK" | "BEHIND" | "COMPLETED";
  keyResults: ChecklistItem[];
}

export interface ReviewCycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "DRAFT" | "ACTIVE" | "CLOSED";
}

export interface PeerFeedback {
  fromId: string;
  rating: number;
  comment: string;
}

export interface Review {
  id: string;
  cycleId: string;
  employeeId: string;
  reviewerId: string | null;
  selfRating: number | null;
  selfComment: string;
  peerFeedback: PeerFeedback[];
  managerRating: number | null;
  managerComment: string;
  status: "PENDING_SELF" | "PENDING_MANAGER" | "COMPLETED";
}

export type NotificationCategory = "HR" | "WORK" | "SYSTEM";
export interface Notification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  category: NotificationCategory;
  read: boolean;
  link: string | null;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  actorId: string | null; // null => system
  action: "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT" | "SYSTEM";
  entity: string;
  message: string;
  category: NotificationCategory;
  at: string;
}

export type ActivityItem = ActivityLog;

export type ModuleKey =
  | "directory"
  | "orgchart"
  | "access"
  | "leaves"
  | "attendance"
  | "payroll"
  | "expenses"
  | "performance"
  | "projects"
  | "onboarding";

export type PermissionMatrix = Record<Role, Record<ModuleKey, boolean>>;

export interface OrgSettings {
  name: string;
  currency: string;
  workWeek: number[]; // 1=Mon..7=Sun working days
}

export interface DB {
  version: number;
  org: OrgSettings;
  departments: Department[];
  employees: Employee[];
  attendance: Attendance[];
  timesheets: Timesheet[];
  leaves: LeaveRequest[];
  holidays: Holiday[];
  projects: Project[];
  boards: Board[];
  tasks: Task[];
  expenses: Expense[];
  payrollRuns: PayrollRun[];
  goals: Goal[];
  cycles: ReviewCycle[];
  reviews: Review[];
  notifications: Notification[];
  activity: ActivityLog[];
  permissions: PermissionMatrix;
}
