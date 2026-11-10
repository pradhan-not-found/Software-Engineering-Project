# Workplace EMS - Dedicated Backend Package

A modular, enterprise-grade, 4-layer backend architecture and **Connected Wedge** reactive engine for the **Workplace Employee Management System (EMS)**.

This package unifies **Core HR Operations** (Directory, Onboarding, Leaves, Shifts, Attendance, Payroll) and **Agile Work Management** (Projects, Kanban Boards, Tasks, Recurrence, Sprints) into a single coherent system.

---

## 1. Architectural Overview: The 4-Layer Pattern

The backend is organized systematically across 4 distinct layers ensuring strict separation of concerns, high testability, and dual-mode data persistence:

```
┌─────────────────────────────────────────────────────────────┐
│                       Layer 4: API                          │
│          REST Route Handlers (Next.js App Router)           │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP Request / Response
┌──────────────────────────────▼──────────────────────────────┐
│                    Layer 1: Validations                     │
│         Input Validation Schemas & Data Constraints         │
└──────────────────────────────┬──────────────────────────────┘
                               │ Validated DTOs
┌──────────────────────────────▼──────────────────────────────┐
│                     Layer 3: Services                       │
│        Domain Business Logic & Connected Wedge Engine       │
└──────────────────────────────┬──────────────────────────────┘
                               │ Domain Entities
┌──────────────────────────────▼──────────────────────────────┐
│                   Layer 2: Repositories                     │
│      Data Access Layer (DAL) with Dual-Mode Fallback        │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
┌──────────────▼──────────────┐┌──────────────▼──────────────┐
│   PostgreSQL (Supabase)     ││    In-Memory Seed Cache     │
│   (When credentials exist)  ││   (Instant Demo Fallback)   │
└─────────────────────────────┘└─────────────────────────────┘
```

### Layer 1: Validations (`src/validations/`)
- Strict type guards and schema sanitizers for all incoming HTTP payloads.
- Validates field presence, types, boundaries, regex formats (e.g., `YYYY-MM`, `YYYY-MM-DD`, ISO timestamps), and enum invariants.
- Returns discriminated unions: `{ ok: true, data: T } | { ok: false, error: string }`.

### Layer 2: Repositories (`src/repositories/`)
- Encapsulates all data access logic and queries.
- **Dual-Mode Persistence**: Automatically queries live Supabase PostgreSQL tables when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are provided; gracefully falls back to an in-memory seed dataset for zero-configuration local development and deterministic testing.

### Layer 3: Services (`src/services/`)
- Houses the core domain logic, state machines, business policies, and cross-cutting **Connected Wedge** operations.
- Enforces organizational security (role-based access control, reporting line hierarchy checks).

### Layer 4: API Route Handlers (`frontend/src/app/api/`)
- Thin HTTP controllers mapping incoming requests, extracting sessions via `ems-session`, running Layer 1 validations, invoking Layer 3 domain services, and returning structured JSON responses.

---

## 2. Directory Structure

```
backend/
├── package.json                   # Backend package configuration & test scripts
├── tsconfig.json                  # TypeScript compiler settings
├── README.md                      # Comprehensive documentation (this file)
├── scripts/                       # Verification test suites
│   ├── verify-page1.mjs           # Page 1: Auth & Session Gateway (11 tests)
│   ├── verify-page2.mjs           # Page 2: Directory & Atomic Onboarding (11 tests)
│   ├── verify-page3.mjs           # Page 3: Leaves & Task Delays (10 tests)
│   ├── verify-page4.mjs           # Page 4: Projects, Kanban & Recurrence (19 tests)
│   ├── verify-full-page4-features.mjs # Page 4 Advanced Work Management (38 tests)
│   ├── verify-page5.mjs           # Page 5: Attendance, Shifts & Policies (16 tests)
│   ├── verify-page6.mjs           # Page 6: Payroll, LOP & Payslips (16 tests)
│   ├── verify-page7.mjs           # Page 7: Admin Overview Dashboard (14 tests)
│   ├── verify-page8.mjs           # Page 8: Expenses & Reimbursements (19 tests)
│   └── verify-all.mjs             # Unified Master Test Runner (154 tests)
└── src/
    ├── index.ts                   # Master package export barrel
    ├── types.ts                   # Domain entity type definitions & contracts
    ├── utils.ts                   # Domain utility functions & date calculators
    ├── seed.ts                    # Fallback in-memory dataset generator
    ├── database/
    │   ├── schema.sql             # Full PostgreSQL relational schema & triggers
    │   ├── supabase.ts            # Supabase client factory & connection detection
    │   ├── supabaseSync.ts        # Database synchronization helpers
    │   └── seed.ts                # Database seed data
    ├── validations/               # Layer 1: Schema validators
    │   ├── auth.schema.ts
    │   ├── employee.schema.ts
    │   ├── leave.schema.ts
    │   ├── task.schema.ts
    │   ├── project.schema.ts
    │   ├── attendance.schema.ts
    │   ├── payroll.schema.ts
    │   ├── dashboard.schema.ts
    │   └── expense.schema.ts
    ├── repositories/              # Layer 2: Data Access Layer (DAL)
    │   ├── user.repository.ts
    │   ├── employee.repository.ts
    │   ├── department.repository.ts
    │   ├── leave.repository.ts
    │   ├── task.repository.ts
    │   ├── project.repository.ts
    │   ├── attendance.repository.ts
    │   ├── timesheet.repository.ts
    │   ├── payroll.repository.ts
    │   ├── dashboard.repository.ts
    │   └── expense.repository.ts
    └── services/                  # Layer 3: Domain Services & Connected Wedge
        ├── auth.service.ts
        ├── employee.service.ts
        ├── leave.service.ts
        ├── task.service.ts
        ├── project.service.ts
        ├── attendance.service.ts
        ├── timesheet.service.ts
        ├── payroll.service.ts
        ├── dashboard.service.ts
        └── expense.service.ts
```

---

## 3. The Connected Wedge Engine

The **Connected Wedge** is the core differentiating architecture of Workplace EMS. Rather than keeping HR records and Project Management tasks in siloed databases, events in HR immediately react across Work Management, and vice-versa:

| Connected Wedge | Trigger Domain | Reactive Target | Business Outcome |
|:---|:---|:---|:---|
| **#1: Atomic Onboarding** | HR / Directory | Work Management | Creating a new employee atomically provisions their employee record, calculates salary structure (HRA 40%), creates a dedicated Onboarding Kanban Board, and spawns 9 starter tasks across 4 workflow stages. |
| **#2: Leave Delay Flagging** | HR / Leaves | Work Management | Approving an employee's leave request scans all tasks assigned to them; tasks due within the leave window are automatically flagged as `DELAYED_ON_LEAVE`, and an audit note recommending peer cover is appended. |
| **#3: Org Chart Permissions** | HR / Org Hierarchy | Work Management | Validates task assignments against the company's reporting line. Managers can only assign tasks to their direct or indirect subordinates (with super-admin override). Reassigning a flagged task to peer cover immediately clears the delay flag. |
| **#4: Attendance & Half-Day** | Attendance / Shifts | HR Payroll | Enforces anti-double clock-in rules. Shifts with elapsed work under 4 hours are automatically converted to `HALF_DAY`. Timesheets with 0 hours logged are strictly rejected. |
| **#5: Loss of Pay (LOP)** | Attendance + Leaves | Payroll Runs | Automatically aggregates unpaid leaves (`UNPAID`, `SICK`, absent days) to compute pro-rata Loss of Pay deductions against gross salary, enforces statutory Provident Fund (PF capped at ₹1,800) and Professional Tax (₹200), and locks processed runs against tampering. |
| **#6: Executive Signals** | All Domains | Overview Dashboard | Aggregates active headcount, real-time organizational operating capacity %, live clock-ins, unified approvals inbox, and live workload collision warnings for managers. |
| **#7: Expense Reimbursements** | Expenses | Payroll Runs | Approved employee expense claims are bundled into the next monthly payroll run under `reimbursements` for payout, transitioning claims from `APPROVED` to `REIMBURSED` upon execution. |

---

## 4. Database Schema (`src/database/schema.sql`)

The database is built on **PostgreSQL** with Row-Level Security (RLS) support:

- **`employees`**: User credentials, contact info, job title, department, manager hierarchy, and bank details.
- **`departments`**: Organizational departments and budgets.
- **`leave_balances` & `leaves`**: Entitlements, requests, approvals, and date spans.
- **`projects` & `boards`**: Work management containers, colors, leads, and boards.
- **`board_columns`**: Kanban workflow stages (To Do, In Progress, In Review, Done) with order indices.
- **`tasks` & `task_assignees`**: Task entities, priorities, due dates, delay flags (`NORMAL`, `DELAYED_ON_LEAVE`, `BLOCKED`), recurrence settings, and junction assignments.
- **`attendance`**: Daily clock-in/out stamps, duration, and status (`PRESENT`, `HALF_DAY`, `ABSENT`).
- **`timesheets`**: Weekly aggregated timesheets with manager decision tracking.
- **`payroll_runs`**: Monthly salary runs, gross pay, LOP deductions, statutory taxes, and state flags (`DRAFT`, `PROCESSED`, `PAID`).
- **`activity_log`**: Cross-domain audit trail for HR and Work events.

---

## 5. Running the Backend Verification Test Suites

All test suites are written in modern, self-contained ES Modules (`.mjs`) with zero external runtime dependencies.

### Master Test Runner (Executes all 8 suites):
```bash
npm test
# or
node scripts/verify-all.mjs
```

### Individual Page Test Suites:
```bash
# Page 1: Auth & Session Gateway (11 tests)
npm run test:page1

# Page 2: Company Directory & Atomic Onboarding (11 tests)
npm run test:page2

# Page 3: Leave Management & Task Delays (10 tests)
npm run test:page3

# Page 4: Projects, Kanban Boards & Recurrence (19 tests)
npm run test:page4

# Page 4 (Advanced): Connected Work Management & Features (38 tests)
npm run test:page4:full

# Page 5: Attendance, Timesheets & Policies (16 tests)
npm run test:page5

# Page 6: Payroll, Salary Structures & LOP Engine (16 tests)
npm run test:page6

# Page 7: Admin Overview Dashboard & Signals (14 tests)
npm run test:page7
```

### Overall Test Suite Results:
- **Total Test Suites**: 8
- **Total Tests Executed**: 135
- **Pass Rate**: 100% (135/135 tests passing)

