# Database Management Pattern & Architecture Plan
**Project:** Employee Management System (EMS) — Team Magnum (Adamas University)  
**Database Manager:** Soubhik Dutta  
**Target:** Robust Database Management Pattern, Unified Schema & Integration Roadmap

---

## 1. Executive Project Analysis

### 1.1 Core Vision & Architectural Positioning
Based on `docs/content.md` and `docs/project_overview.tex`, this project is **not** a standard disconnected HR tool or an isolated Kanban board. Its core market differentiator is the **Connected Layer**:

> **The Connected Wedge:** HR data and Work data live in the *same* authoritative system. Events in HR (leave approval, onboarding, org hierarchy changes) instantly trigger reactive updates in Work Management (task flagging, onboarding board auto-generation, reporting hierarchy-driven access control, and objective data-driven performance reviews).

### 1.2 Current State Assessment
- **Frontend (`frontend/`):** Next.js 14 App Router, Tailwind CSS, TypeScript, Dark/Light theme switching, existing Admin views (`admin/directory`, `admin/payroll`, `admin/leaves`) and Employee views (`employee/tasks`, `employee/leaves`, `employee/profile`). All currently render static UI mocks.
- **Backend / Database Layer:** Currently **unimplemented**. There is no ORM, migration tool, schema definition, or active database connection.
- **Team Roles & Responsibilities:**
  - **Database Manager (Soubhik Dutta):** Needs a robust, normalized, production-grade schema with clear migration & indexing strategies.
  - **Backend Developer (Aniruddha Das):** Needs clean abstractions (Repository & Service patterns, transaction boundaries, validation).
  - **Frontend Developer (Srijit Paul):** Needs type-safe models, clean API endpoints, and predictable JSON responses.
  - **Data Analysts (Asmita Mishra & Anisha Dan):** Need structured transactional tables and query-friendly reporting structures (attendance stats, payroll breakdowns, workload metrics).
  - **Team Leader (Souradeep Pradhan):** Needs modularity, reliability, and full alignment with SRS requirements.

---

## 2. Recommended Database Technology & Paradigm

### 2.1 Database Selection: PostgreSQL
We recommend **PostgreSQL** (with **Prisma ORM** as the primary data modeling and migration engine):
1. **Relational Rigor & ACID Compliance:** Vital for payroll calculations, leave balance deductions, and financial ledgers where dirty reads or partial writes are unacceptable.
2. **Recursive Hierarchical Queries:** The organizational chart (reporting managers, subordinates, department hierarchies) requires recursive relational querying (`WITH RECURSIVE`), which PostgreSQL handles natively.
3. **Hybrid JSONB Flexibility:** Used for flexible onboarding checklists, dynamic audit payloads, and custom notification parameters without altering relational tables.
4. **Type-Safe Full-Stack Alignment:** Prisma generates direct TypeScript types for Next.js, bridging the frontend and database seamlessly with zero type divergence.

---

## 3. Database Architecture & Management Patterns

To ensure high maintainability and prevent database logic from leaking into UI components, we establish a **4-Layer Database Management Pattern**:

```
┌────────────────────────────────────────────────────────┐
│            Presentation Layer (Next.js Pages)          │
└───────────────────────────▲────────────────────────────┘
                            │ Type-safe DTOs
┌───────────────────────────▼────────────────────────────┐
│      API Route Handlers / Server Actions (/api/*)      │
└───────────────────────────▲────────────────────────────┘
                            │ Business Logic
┌───────────────────────────▼────────────────────────────┐
│         Domain Services & Connected Event Engine       │
│  (LeaveService, PayrollService, TaskEngine, EventBus)  │
└───────────────────────────▲────────────────────────────┘
                            │ Data Queries / Transactions
┌───────────────────────────▼────────────────────────────┐
│         Repository / Data Access Layer (DAL)           │
│        (UserRepository, TaskRepo, LeaveRepo)           │
└───────────────────────────▲────────────────────────────┘
                            │ Prisma Client Singleton
┌───────────────────────────▼────────────────────────────┐
│           PostgreSQL Database (Engine & Schema)         │
└────────────────────────────────────────────────────────┘
```

### Pattern 1: Database Client Singleton (`lib/db.ts`)
Prevents connection pool exhaustion in Next.js fast-refresh development environments.

### Pattern 2: Repository Pattern (Data Access Layer)
All raw database reads, writes, and complex joins are encapsulated in focused repositories. Business rules (e.g., "Cannot approve leave if balance is 0") live in **Domain Services**, not inside database queries.

### Pattern 3: Transaction Boundary Pattern (`$transaction`)
Critical multi-table operations execute within atomic transactions:
- **Onboarding New Hire:** Creates User record + Employee Profile + Salary Config + default Onboarding Kanban Board + starter tasks.
- **Leave Approval:** Validates leave balance + decrements quota + marks request `APPROVED` + flags active tasks as `ON_LEAVE_BLOCKED` + dispatches manager notifications.

### Pattern 4: The Reactive Event Engine (Connected Wedge)
An internal Domain Event Bus listening to transactional events:
- `EVENT_LEAVE_APPROVED` → triggers task reassignment alerts.
- `EVENT_ONBOARDING_INITIALIZED` → triggers auto-generated Kanban board creation.
- `EVENT_TASK_STATUS_CHANGED` → updates employee performance velocity aggregates.

---

## 4. Entity-Relationship Schema Architecture

```text
[DEPARTMENT] 1 ──── ∞ [EMPLOYEE_PROFILE] (has)
[EMPLOYEE_PROFILE] 1 ──── ∞ [EMPLOYEE_PROFILE] (manages hierarchy)
[USER] 1 ──── 1 [EMPLOYEE_PROFILE] (belongs to)

[EMPLOYEE_PROFILE] 1 ──── ∞ [ATTENDANCE] (logs)
[EMPLOYEE_PROFILE] 1 ──── ∞ [LEAVE_BALANCE] (holds)
[EMPLOYEE_PROFILE] 1 ──── ∞ [LEAVE_REQUEST] (submits)
[EMPLOYEE_PROFILE] 1 ──── ∞ [SALARY_STRUCTURE] (has)
[EMPLOYEE_PROFILE] 1 ──── ∞ [PAYROLL_RECORD] (receives)

[PROJECT] 1 ──── ∞ [KANBAN_BOARD] (contains)
[KANBAN_BOARD] 1 ──── ∞ [BOARD_COLUMN] (contains)
[BOARD_COLUMN] 1 ──── ∞ [TASK] (contains)
[TASK] 1 ──── ∞ [TASK_ASSIGNEE] ∞ ──── 1 [EMPLOYEE_PROFILE] (assigned)

[EMPLOYEE_PROFILE] 1 ──── ∞ [PERFORMANCE_REVIEW] (reviewed)
[TASK] ∞ ──── 1 [PERFORMANCE_METRIC] (aggregates into)

[USER] 1 ──── ∞ [AUDIT_LOG] (triggers)
[USER] 1 ──── ∞ [NOTIFICATION] (receives)
```

### Module 1: Identity, Organization & Access Control
- `User`: Handles authentication (`email`, `passwordHash`, `role`: `SUPER_ADMIN | HR_ADMIN | MANAGER | EMPLOYEE`, `status`: `ACTIVE | SUSPENDED`).
- `Department`: Department tree (`id`, `name`, `code`, `headEmployeeId`, `parentDepartmentId`).
- `EmployeeProfile`: Master professional and personal information (`employeeCode`, `designation`, `joiningDate`, `reportingManagerId`, `phone`, `address`, `emergencyContact`).

### Module 2: Core HR (Attendance, Leaves & Payroll)
- `Attendance`: Daily record (`employeeId`, `date`, `clockIn`, `clockOut`, `status`: `PRESENT | ABSENT | HALF_DAY | REMOTE | ON_LEAVE`).
- `LeaveType`: (`name`: Annual, Sick, Casual, Maternity, `defaultDaysPerYear`).
- `LeaveBalance`: Per-employee yearly allocation (`year`, `allocatedDays`, `usedDays`, `pendingDays`).
- `LeaveRequest`: Form request (`startDate`, `endDate`, `reason`, `status`: `PENDING | APPROVED | REJECTED`, `approverId`).
- `SalaryStructure`: Baseline compensation formula (`basicSalary`, `hra`, `allowances`, `deductions`, `taxSlab`, `effectiveDate`).
- `PayrollRecord`: Historical monthly disbursement record (`month`, `year`, `grossSalary`, `totalDeductions`, `netSalary`, `paymentStatus`, `payslipUrl`).

### Module 3: Work Management (Projects, Boards, Tasks)
- `Project`: Work container tied to departments or cross-functional teams (`name`, `departmentId`, `leadId`, `status`).
- `KanbanBoard`: Board container (`projectId`, `title`, `boardType`: `PROJECT | ONBOARDING_WORKFLOW | PERSONAL`).
- `BoardColumn`: Workflow stages (`boardId`, `name`: e.g. "To Do", "In Progress", "Review", "Done", `orderIndex`).
- `Task`: Individual unit of work (`columnId`, `title`, `description`, `priority`: `LOW | MEDIUM | HIGH | URGENT`, `dueDate`, `statusFlag`: `NORMAL | DELAYED_ON_LEAVE | BLOCKED`).
- `TaskAssignee`: Many-to-many junction (`taskId`, `employeeId`).

### Module 4: Connected Integration & Performance
- `PerformanceReview`: Evaluation tied to data (`employeeId`, `reviewerId`, `cycleName`, `kpiScore`, `tasksCompletedCount`, `deadlinesMetRate`, `managerFeedback`).
- `CrossModuleSignal`: Event queue for decoupling async side effects (e.g. sending notifications, flagging tasks).

### Module 5: Governance & Auditing
- `AuditLog`: Immutable history of changes (`actorUserId`, `entityType`, `entityId`, `action`: `CREATE | UPDATE | DELETE`, `oldValueJson`, `newValueJson`, `timestamp`).
- `Notification`: In-app and email activity stream (`recipientUserId`, `title`, `message`, `category`: `HR | WORK | SYSTEM`, `isRead`, `linkUrl`).

---

## 5. Phased Implementation Plan

| Phase | Milestone | Key Deliverables |
| :--- | :--- | :--- |
| **Phase 1** | **Database Tooling & Prisma Setup** | Initialize Prisma ORM in `frontend/`, configure `.env`, establish connection client (`lib/db.ts`). |
| **Phase 2** | **Schema Definition & Migration** | Write full `schema.prisma` covering all 5 modules, indexes, foreign keys, and relations. Execute baseline migration. |
| **Phase 3** | **Seed Script & Realistic Enterprise Data** | Implement comprehensive `prisma/seed.ts` populating sample departments, users, employees (matching existing directory mock: Sarah Jenkins, Mike Ross, etc.), tasks, leave requests, and payroll records. |
| **Phase 4** | **Data Access Layer & Repositories** | Build typed repositories (`repositories/user.repo.ts`, `repositories/leave.repo.ts`, `repositories/task.repo.ts`) and transactional service methods. |
| **Phase 5** | **Event Engine & Connected Layer** | Implement event hooks for cross-module features (auto-onboarding board, leave ↔ task flag). |
| **Phase 6** | **Next.js API Routes & UI Wiring** | Create API endpoints (`/api/employees`, `/api/leaves`, `/api/tasks`, `/api/payroll`) and bind them to the existing Admin & Employee UI pages. |
