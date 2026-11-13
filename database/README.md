# Workplace EMS - Dedicated Database Architecture

This directory contains all database-related definitions, PostgreSQL DDL schemas, architectural specifications, seeding routines, and verification scripts for the **Workplace Employee Management System (EMS)**.

---

## Directory Overview

```text
database/
├── schema.sql                 # Complete PostgreSQL / Supabase DDL schema
├── supabase_schema.sql        # Supabase-compatible DDL schema (with extensions & RLS)
├── database_planning.md       # Full 4-layer DAL & relational database architecture plan
├── scripts/
│   ├── seed-supabase.mjs      # Live database seeder for Supabase
│   └── check-supabase.mjs     # Live database integrity & pending queue auditor
└── README.md                  # Database documentation and run guide
```

---

## Core Entities & Schema Architecture

The database implements a normalized relational model supporting the full corporate HRMS lifecycle:

1. **Departments (`departments`)**: Corporate organization units (Engineering, Product & Design, People & Culture, Growth & Marketing, Operations & Finance).
2. **Employees (`employees`)**: Comprehensive corporate worker profiles with role, department, manager hierarchy, compensation (basic, HRA, allowances), bank details, PAN, and account status (`ACTIVE`, `ONBOARDING`, `SUSPENDED`, `TERMINATED`).
3. **Tasks & Kanban Boards (`boards`, `board_columns`, `tasks`, `task_assignees`)**: Work management system featuring connected wedge delay flags (`DELAYED_ON_LEAVE`, `DELAYED_HR_REVIEW`, `DELAYED_PAYROLL_LOCK`).
4. **Leaves & Absences (`leaves`)**: Annual, Casual, Sick, Unpaid, and Maternity leave tracking with net working-day calculation, peer cover recommendation, and admin approval workflows.
5. **Expense Reimbursements (`expenses`)**: Corporate expenditure submissions with category tagging, receipt attachments, and approval tracking.
6. **Attendance & Timesheets (`attendance`, `timesheets`)**: Daily biometric check-ins, automated status classification (`PRESENT`, `LATE`, `HALF_DAY`, `ABSENT`), and project hour timesheet approvals.
7. **Payroll & Compensation (`payroll_runs`, `payslips`)**: Monthly salary generation, automated Loss of Pay (LOP) deductions, EPF, Professional Tax, and net salary computation.
8. **Performance Reviews (`cycles`, `reviews`)**: 360-degree appraisal cycles, self-evaluations, manager reviews, and objective delivery tracking.
9. **Notifications & Audits (`notifications`)**: Real-time cross-platform alerting and audit logs.

---

## Running the Database

### 1. Apply Schema in Supabase
1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **SQL Editor** in the left sidebar.
3. Open `database/schema.sql`, copy its entire content, paste into the query window, and click **Run**.

### 2. Seed Database with Real Corporate Data
To populate the live database with authentic corporate employees, departments, tasks, and pending requests for admin decisions:
```bash
node database/scripts/seed-supabase.mjs
```

### 3. Verify Database Integrity
To audit active employees, department linkages, and pending leave/expense queues:
```bash
node database/scripts/check-supabase.mjs
```

---

## Dual-Layer Fallback & Connected Wedge Sync

- **Cloud Mode**: When `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are provided in `frontend/.env.local`, the DAL connects directly to Supabase PostgreSQL.
- **In-Memory Fallback Mode**: If network is offline or credentials are unset, the system seamlessly falls back to the deterministic in-memory store (`seed.ts`), ensuring 100% offline test suite reliability.
