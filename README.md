# Workplace — Employee Management System (EMS)

<p align="center">
  <img src="frontend/public/logo.png" alt="Workplace Logo" width="320"/>
</p>

<p align="center">
  <strong>The Unified Workspace for Enterprise HR Operations & Connected Work Management</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/PostgreSQL-Ready-336791?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Academic-Team_Magnum-purple?style=for-the-badge" alt="Team Magnum" />
</p>

---

## 📌 Table of Contents
1. [Overview & Project Aim](#-overview--project-aim)
2. [Team Members & Stakeholders](#-team-members--stakeholders)
3. [Architecture & Diagrammatic Flows](#-architecture--diagrammatic-flows)
   - [System Context & Architecture Flow](#1-system-context--architecture-flow)
   - [Software User Journey Flow](#2-software-user-journey-flow)
   - [Connected Wedge — Reactive Event Flow](#3-connected-wedge--reactive-event-flow)
4. [Feature Breakdown](#-feature-breakdown)
   - [Core Common HR Features (Table Stakes)](#41-core-common-hr-features-table-stakes)
   - [Work Management & Connected Features (The Wedge)](#42-work-management--connected-differentiator-features-the-wedge)
   - [Demo Accounts](#43-demo-accounts)
5. [Repository Structure](#-repository-structure)
6. [Getting Started on Localhost](#-getting-started-on-localhost)
7. [Making It Live (Production Deployment)](#-making-it-live-production-deployment)
8. [Database & Backend Roadmap](#-database--backend-roadmap)
9. [License & Acknowledgments](#-license--acknowledgments)

---

## 🚀 Overview & Project Aim

Traditional organizations face a major operational dilemma: **Human Resource Management Systems (HRMS)** and **Work/Task Management Tools (e.g., Jira, Asana, Trello)** operate in complete isolation. This fragmentation leads to:
- Disconnected onboarding pipelines.
- Managers assigning critical sprint tasks to employees who are approved on annual leave.
- Performance reviews based on subjective memory rather than objective project deliverables.
- Dual maintenance of employee access permissions and reporting hierarchies.

**Workplace (EMS)** solves this problem with the **Connected Wedge Strategy**:
> *Rather than competing on endless project management feature bloat, Workplace wins on tight, native, reactive connections between HR data and daily work data living in the exact same system.*

Developed by **Team Magnum**, Department of Computer Science & Engineering, **Adamas University**.

---

## 👥 Team Members & Stakeholders

| Member | Academic / Project Role | Primary Focus Area |
| :--- | :--- | :--- |
| **Souradeep Pradhan** | **Team Leader** | Project Architecture, SRS Specifications, System Coordination |
| **Srijit Paul** | **Frontend Developer** | Next.js 14 App Router, UI/UX Design System, Dashboard Engineering |
| **Aniruddha Das** | **Backend Developer** | Server Handlers, API Routes, Business Logic & Workflows |
| **Asmita Mishra & Anisha Dan** | **Data Analysts** | Reporting Structures, Metric Modeling & Analytical Insights |
| **Soubhik Dutta** | **Database Manager** | Relational Schemas, PostgreSQL Strategy, Data Normalization |

---

## 📊 Architecture & Diagrammatic Flows

### 1. System Context & Architecture Flow

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               SYSTEM ACTORS & ROLES                                    │
│       [ HR Admin / Super Admin ]     [ Department Manager ]     [ Employee ]           │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER (Next.js 14 App Router + Tailwind CSS)            │
│  Landing Page (/) ──▶ Auth Portal (/login, /signup)                                    │
│        │                                                                               │
│        ▼                                                                               │
│  ┌─────────────────────────────────────────┐  ┌──────────────────────────────────────┐ │
│  │ Admin Workspace (/admin)                │  │ Employee Portal (/employee)          │ │
│  │ • Directory & Onboarding Modal          │  │ • Personal Overview Dashboard        │ │
│  │ • Leave Approval Queue & Ledgers        │  │ • Tasks (List & Kanban Views)        │ │
│  │ • Payroll & Tax Breakdown Engine        │  │ • Leave Balance & Submission         │ │
│  │ • Performance Reviews & Access Control  │  │ • Personal Profile & Manager Info    │ │
│  └────────────────────┬────────────────────┘  └──────────────────┬───────────────────┘ │
└───────────────────────┼──────────────────────────────────────────┼─────────────────────┘
                        │                                          │
                        ▼                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CONNECTED BUSINESS ENGINE & EVENT BUS                           │
│  • RBAC Access & Route Protection Gate                                                 │
│  • Auto-generate Onboarding Kanban Boards for New Hires                                │
│  • Proactive Task Delay Signaling on Approved Leave                                    │
│  • Org Chart-driven Task Permission Inheritance                                        │
│  • Prepopulate Review Cycles with Real Sprint Velocity                                 │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              DATA & PERSISTENCE LAYER                                  │
│  • Prisma ORM / Data Access Layer (DAL)                                                │
│  • PostgreSQL Database: Users, Org Hierarchy, Leaves, Tasks, Payroll, Reviews          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 2. Software User Journey Flow

This diagram illustrates how different users navigate through the Workplace platform after authentication:

```text
                          ┌──────────────────────────┐
                          │  🌐 User Visits Platform  │
                          └─────────────┬────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │   Landing Page ( / )     │
                          │   Overview, Hero, CTA    │
                          └─────────────┬────────────┘
                                        │
                                 [Authenticated?]
                                 /              \
                             No /                \ Yes
                               ▼                  ▼
                    ┌─────────────────────┐    ┌─────────────────────┐
                    │     Auth Portal     │    │   Role Dispatcher   │
                    │   /login & /signup  │───▶│   (RBAC Session)    │
                    └─────────────────────┘    └──────────┬──────────┘
                                                          │
                   ┌──────────────────────────────────────┴──────────────────────────────────────┐
                   │                                                                             │
           [ SUPER_ADMIN / HR_ADMIN / MANAGER ]                                             [ EMPLOYEE ]
                   │                                                                             │
                   ▼                                                                             ▼
┌─────────────────────────────────────────────────────────┐   ┌─────────────────────────────────────────────────────────┐
│              🔧 ADMIN WORKSPACE (/admin)                │   │             👤 EMPLOYEE WORKSPACE (/employee)           │
│                                                         │   │                                                         │
│  • Dashboard (/admin) ── Headcount KPIs, Approvals Feed │   │  • Dashboard (/employee) ── Personal stats & quick act. │
│  • Directory (/admin/directory) ── New hire modal       │   │  • My Tasks (/employee/tasks) ── List & Kanban board    │
│  • Leave Queue (/admin/leaves) ── Approve / Reject      │   │  • My Leaves (/employee/leaves) ── Balance & requests   │
│  • Payroll (/admin/payroll) ── Salary, taxes, payslips  │   │  • My Profile (/employee/profile) ── Hierarchy info     │
│  • Performance (/admin/performance) ── Review cycles    │   └────────────────────────────┬────────────────────────────┘
│  • Access (/admin/access) ── Role & permission matrix   │                                │
└───────────────────────────┬─────────────────────────────┘                                │
                            │                                                              │
                            │                🔄 CONNECTED WEDGE INTERACTIONS               │
                            │  [Onboarding Hire]  ──▶  Auto-generates onboarding board ──▶ │
                            │  [Approved Leave]   ──▶  Flags active tasks as delayed  ──▶ │
                            │  [Review Cycle]     ──◀  Pulls actual task velocity data ───┘
```

---

### 3. Connected Wedge — Reactive Event Flow

This is the core differentiator: HR events and Work events are **reactively connected** in a single system.

```text
┌──────────────────────────┐      ┌──────────────────────────┐      ┌───────────────────────────────────────────────┐
│     HR DOMAIN EVENTS     │      │   CONNECTED EVENT BUS    │      │             AUTOMATED WORK EFFECTS            │
├──────────────────────────┤      ├──────────────────────────┤      ├───────────────────────────────────────────────┤
│ 1. New Hire Added to     │ ───▶ │                          │ ───▶ │ Auto-generate Onboarding Kanban Board         │
│    Company Directory     │      │                          │      │ (IT setup, compliance, buddy intro, training) │
│                          │      │                          │      │                                               │
│ 2. Employee Leave        │ ───▶ │   ⚡ REACTIVE ENGINE     │ ───▶ │ Auto-flag assigned tasks as "Delayed"         │
│    Request Approved      │      │   Centralized Domain     │      │ and suggest immediate reassignment to peers   │
│                          │      │   Event Dispatcher       │      │                                               │
│ 3. Organizational Chart  │ ───▶ │                          │ ───▶ │ Inherit task view & delegate permissions      │
│    Reporting Updated     │      │                          │      │ directly from organizational hierarchy        │
│                          │      │                          │      │                                               │
│ 4. Daily Attendance &    │ ───▶ │                          │ ───▶ │ Embed leave context & capacity into           │
│    Time Logged           │      │                          │      │ sprint task planning and manager review       │
└──────────────────────────┘      └────────────┬─────────────┘      └───────────────────────┬───────────────────────┘
                                               │                                            │
                                               ▼                                            ▼
                                  ┌─────────────────────────────────────────────────────────────────┐
                                  │                  🎯 OBJECTIVE PERFORMANCE LOOP                  │
                                  │   Pull verified task velocity, deadline completion rate, and    │
                                  │   peer contributions directly into performance review cycles.   │
                                  └─────────────────────────────────────────────────────────────────┘
```

---

## 🌟 Feature Breakdown

> **Status:** the frontend is fully implemented end-to-end. Every module below is interactive and backed by a typed, in-browser data store (`src/lib/store.tsx`) that persists to `localStorage` and mirrors the planned Prisma/PostgreSQL schema — so the UI can be wired to real API routes later without reshaping data.

### 4.1. Core Common HR Features (Table Stakes)

| Module | Route(s) | What you can do |
| :--- | :--- | :--- |
| 🔐 **Authentication & RBAC** | `/login`, `/signup`, `/dashboard` | Email/password login with validation, demo-account dropdown, role-based redirect (`SUPER_ADMIN`, `HR_ADMIN` → Admin Console; `MANAGER`, `EMPLOYEE` → Employee Portal), route guards, organization sign-up, logout. |
| 📊 **Admin Overview** | `/admin` | Live KPIs (headcount, pending approvals, org capacity, clock-ins), approval inbox with one-click approve/reject, connected-engine signals, global HR + Work activity feed, headcount by department, upcoming holidays, who is out today. |
| 👥 **Employee Directory & Profiles** | `/admin/directory`, `/admin/directory/[id]`, `/employee/directory` | Search, filter (department/status/role), sort, table/card views, CSV export, **Add New Hire** modal. Full employee record: personal & emergency info, job & reporting line (editable), documents (upload/verify), assets, compensation, leave balances, work & performance. |
| 🌳 **Org Chart** | `/admin/org-chart`, `/employee/org-chart` | Interactive reporting tree with expand/collapse, department filter and search. |
| 🧭 **Onboarding & Offboarding** | `/admin/onboarding` | Onboarding pipeline (board progress, document checklist, offer-letter status, buddy, complete onboarding). Offboarding: exit checklist, asset return, open-work hand-off, full & final settlement (pro-rata salary + leave encashment). |
| ⏱️ **Attendance & Time Tracking** | `/admin/attendance`, `/employee/attendance` | Clock in/out (office or remote) with live timer, daily register with corrections, monthly summary + CSV, shift management, weekly timesheets (draft → submit → approve/reject). |
| 🏖️ **Leave Management** | `/admin/leaves`, `/employee/leaves` | Apply with live working-day count & balance validation, cancel pending requests, approval queue with workload context, history & balance ledger, holiday calendar (month grid + management). |
| 💰 **Payroll** | `/admin/payroll`, `/employee/payslips` | Salary structures, monthly payroll runs (Draft → Processed → Paid) with PF, professional tax, slab-based TDS and loss-of-pay from attendance/unpaid leave, printable/downloadable payslips, YTD summary. |
| 🧾 **Expense Claims** | `/admin/expenses`, `/employee/expenses` | Submit claims with receipts, approve/reject; approved claims are reimbursed automatically through the next payroll run. |
| 📈 **Performance Management** | `/admin/performance`, `/employee/performance` | Goals/OKRs/KPIs with key results, review cycles (launch/close), self, peer and manager reviews with star ratings, rating distribution. |
| 🔒 **Access Control** | `/admin/access` | Role × module permission matrix (drives sidebar visibility), role changes with Super Admin safeguards, suspend/activate accounts, password reset. |
| 📉 **Reports** | `/admin/reports` | Headcount, status mix, attendance, leave utilisation, payroll trend, salary cost by department, task throughput, top contributors. |
| 🔔 **Notifications & Audit Log** | `/admin/notifications`, `/employee/notifications` | Unified inbox (HR / Work / System) with bell dropdown and mark-as-read, plus an organization-wide audit log with filters and CSV export. |
| ⚙️ **Settings** | `/admin/settings` | Organization name, departments, holiday calendar, demo-data reset. |

---

### 4.2. Work Management & Connected Differentiator Features (The Wedge)

- 📋 **Dual-View Tasks (`/employee/tasks`)** — List view grouped by Overdue / Today / This week / Later, and a cross-board **drag-and-drop Kanban**. Scopes: *Assigned to me*, *My team*, *Personal to-dos*. Priorities, due dates, **recurring tasks** (daily/weekly auto-respawn), tags, comments, file attachments.
- 🗂️ **Projects & Boards (`/admin/projects`)** — Project creation, per-project Kanban with **custom workflow stages** (add/rename/remove), member filter, progress tracking.
- 🔄 **Onboarding → Auto-Generated Kanban Board** — Adding a new hire instantly creates an onboarding board with IT, HR, Manager, Buddy and Employee tasks assigned to the right people, and notifies them.
- ⚠️ **Leave → Task Delay Signals** — Approving leave flags the person's affected tasks as *"Delayed — On Leave"*, comments on them, notifies task owners, and **suggests the least-loaded same-department peer** for one-click reassignment.
- 🌳 **Org Chart → Task Permissions** — Who can assign or see whose tasks is inherited from the reporting hierarchy (managers see their subtree; admins see all). Changing a manager re-inherits permissions automatically.
- 🎯 **Performance Reviews → Real Task Data** — Reviews are pre-populated with tasks completed, on-time rate, missed deadlines, projects, attendance rate and leave days for the cycle window.
- ⏱️ **Attendance → Workload Context** — Managers (`/employee/team`) and admins see open/overdue/flagged tasks next to today's attendance and planned leave when approving time off.
- 🔔 **Cross-Module Notifications** — One feed for HR events (leave approved, new joiner, review due, payslip ready) and Work events (task assigned, comment, deadline).
- 🌓 **Dark / Light / System theme**, responsive layouts with a mobile sidebar, global search (people, projects, tasks), toasts and confirmation dialogs.

---

### 4.3. Demo Accounts

All demo users share the password **`demo1234`**. They can also be picked from the *Demo account* dropdown on the login page:

| Role | Email | Lands on |
| :--- | :--- | :--- |
| Super Admin | `arjun@workplace.com` | `/admin` |
| HR Admin | `neha@workplace.com` | `/admin` |
| Manager | `john@workplace.com` | `/employee` (with **My Team**) |
| Employee | `alice@workplace.com` | `/employee` |

Data is seeded relative to today's date and saved in your browser. Use **Profile menu → Reset demo data** to start fresh.

---

## 📂 Repository Structure

```text
Software-Engineering-Project/
├── LICENSE
├── README.md                              # This file
├── docs/
│   ├── content.md                         # Product feature specification
│   └── project_overview.tex               # LaTeX academic documentation
└── frontend/                              # Next.js 14 web application
    ├── package.json · tsconfig.json · tailwind.config.ts · next.config.mjs
    ├── public/                            # Logo, background, fonts, icons
    └── src/
        ├── database_planning.md           # PostgreSQL schema & 4-layer DAL blueprint
        ├── lib/
        │   ├── types.ts                   # Domain model (mirrors the planned Prisma schema)
        │   ├── seed.ts                    # Realistic demo organization (dates relative to today)
        │   ├── store.tsx                  # Client data store + all domain actions & connected engine
        │   └── utils.ts                   # Dates, payroll/tax maths, hierarchy, metrics, RBAC helpers
        ├── components/
        │   ├── AppShell.tsx               # Sidebar, header, global search, notification bell, route guard
        │   ├── ui.tsx                     # Design-system primitives (Button, Card, Modal, Table, Toast…)
        │   ├── tasks/TaskComponents.tsx   # Kanban board, task cards, create/detail modals
        │   ├── org/                       # Org chart, new-hire, offboarding & profile modals
        │   ├── employee/ClockWidget.tsx   # Clock in/out widget
        │   ├── Payslip.tsx                # Printable payslip
        │   ├── PerformanceMetrics.tsx     # Task/attendance-driven review metrics
        │   ├── NotificationsCenter.tsx    # Inbox + audit log
        │   └── ProfileDropdown.tsx · ThemeProvider.tsx
        └── app/
            ├── page.tsx                   # Landing page
            ├── (auth)/login · (auth)/signup
            ├── dashboard/                 # Role dispatcher
            ├── admin/                     # overview, directory/[id], org-chart, onboarding, access,
            │                              # projects, leaves, attendance, payroll, expenses,
            │                              # performance, reports, notifications, settings
            └── employee/                  # hub, tasks, leaves, attendance, payslips, expenses,
                                           # performance, profile, team, directory, org-chart, notifications
```

---

## 💻 Getting Started on Localhost

### Setup Pipeline — Visual Overview

```text
┌──────────────────┐       ┌────────────────────────┐       ┌──────────────────┐       ┌───────────────────┐
│ 1. PREREQUISITES │ ────▶ │ 2. CLONE & NAVIGATE    │ ────▶ │ 3. INSTALL DEPS  │ ────▶ │ 4. RUN DEV SERVER │
│  • Node.js ≥ 18  │       │  git clone <repo-url>  │       │  cd frontend     │       │  npm run dev      │
│  • npm / pnpm    │       │  cd Software-Eng...    │       │  npm install     │       │  :3000 live       │
└──────────────────┘       └────────────────────────┘       └──────────────────┘       └───────────────────┘
```

### Quick Commands

```bash
# Step 1 — Clone
git clone https://github.com/pradhan-not-found/Software-Engineering-Project.git
cd Software-Engineering-Project

# Step 2 — Install
cd frontend
npm install

# Step 3 — Run
npm run dev
```

> **Result →** Open **http://localhost:3000**, click **Log In**, pick a role from the *Demo account* dropdown and explore. No database or `.env` is required — the frontend ships with a self-contained demo data layer.

---

### 🧭 Route Map — Pages You Can Explore

```text
http://localhost:3000/
├── / ............................ Landing page
├── /login · /signup ............. Authentication (demo-account dropdown on login)
├── /dashboard ................... Role dispatcher → /admin or /employee
├── admin/ ....................... HR Admin Console (SUPER_ADMIN, HR_ADMIN)
│   ├── /admin ................... Overview: KPIs, approval inbox, connected signals, activity feed
│   ├── /admin/directory ......... Directory + Add New Hire;  /admin/directory/[id] full record
│   ├── /admin/org-chart ......... Reporting hierarchy
│   ├── /admin/onboarding ........ Onboarding & offboarding pipelines
│   ├── /admin/access ............ Permission matrix, roles, account status
│   ├── /admin/projects .......... Projects & Kanban boards (incl. onboarding boards)
│   ├── /admin/leaves ............ Leave queue, history, balances, holiday calendar
│   ├── /admin/attendance ........ Daily register, monthly summary, shifts, timesheets
│   ├── /admin/payroll ........... Payroll runs, payslips, salary structures, tax summary
│   ├── /admin/expenses .......... Expense claim approvals
│   ├── /admin/performance ....... Review cycles, goals, rating distribution
│   ├── /admin/reports ........... Analytics
│   ├── /admin/notifications ..... Inbox + audit log
│   └── /admin/settings .......... Organization, departments, holidays, demo reset
└── employee/ .................... Employee Portal (all roles)
    ├── /employee ................ Hub: clock-in, stats, today's tasks, feed
    ├── /employee/tasks .......... List & Kanban (mine / team / personal)
    ├── /employee/leaves ......... Balances & requests
    ├── /employee/attendance ..... Attendance calendar & weekly timesheet
    ├── /employee/payslips ....... Payslips & salary breakdown
    ├── /employee/expenses ....... Expense claims
    ├── /employee/performance .... Goals, self/peer reviews
    ├── /employee/profile ........ Profile, documents, assets, password
    ├── /employee/team ........... Manager view (workload + approvals + reviews)
    ├── /employee/directory · /employee/org-chart
    └── /employee/notifications
```

> **Windows tip:** Next.js 14.2.3 fails `next build` with `PageNotFoundError: Cannot find module for page: /_document` when the project path contains parentheses (e.g. `New folder (2)`). Clone into a path without brackets, or map one with `subst W: "D:\New folder (2)\software"` and build from `W:\frontend`. `npm run dev` is unaffected.

---

## 🌐 Making It Live (Production Deployment)

### Deployment Pipeline — Visual Overview

```text
                           ┌───────────────────────────┐
                           │    LOCAL CODE BASE        │
                           │    git commit & push      │
                           └─────────────┬─────────────┘
                                         │
                                         ▼
                           ┌───────────────────────────┐
                           │   GITHUB REPOSITORY       │
                           │   main branch (origin)    │
                           └─────────────┬─────────────┘
                                         │
                   ┌─────────────────────┼─────────────────────┐
                   │                     │                     │
                   ▼                     ▼                     ▼
        ┌─────────────────────┐┌─────────────────────┐┌─────────────────────┐
        │  OPTION A: VERCEL   ││   OPTION B: VPS     ││  OPTION C: DOCKER   │
        │   (Recommended)     ││   (Ubuntu + Nginx)  ││   (Containerized)   │
        ├─────────────────────┤├─────────────────────┤├─────────────────────┤
        │ • Import repo       ││ • npm run build     ││ • docker build      │
        │ • Root: frontend    ││ • PM2 daemon        ││ • docker run -p 3000│
        │ • Zero config       ││ • Nginx proxy :3000 ││ • Portable image    │
        │ • Free SSL & CDN    ││ • Certbot SSL       ││ • Isolated runtime  │
        └──────────┬──────────┘└──────────┬──────────┘└──────────┬──────────┘
                   │                      │                      │
                   └──────────────────────┼──────────────────────┘
                                          │
                                          ▼
                             ┌────────────────────────┐
                             │  MANAGED POSTGRESQL    │
                             │  Supabase / Neon / RDS │
                             │  DATABASE_URL in .env  │
                             └────────────────────────┘
```

---

### ⭐ Method 1 — Vercel (Zero-Config, Recommended)

| Step | Action |
|:---:|:---|
| **1** | `git push origin main` — push latest code to GitHub |
| **2** | Go to [vercel.com](https://vercel.com/) → **Add New Project** → Import your repo |
| **3** | Set **Root Directory** to `frontend` |
| **4** | Click **Deploy** → auto-builds, provisions SSL, gives you a live URL |

---

### Method 2 — Self-Hosted VPS (Ubuntu + Nginx)

```bash
# Build
cd frontend && npm run build

# Run with PM2
npm install -g pm2
pm2 start npm --name "workplace" -- start
pm2 save && pm2 startup

# Nginx reverse proxy (/etc/nginx/sites-available/workplace)
# server { proxy_pass http://localhost:3000; }

# SSL via Certbot
sudo certbot --nginx -d yourdomain.com
```

---

### Method 3 — Docker Container

```bash
# Dockerfile inside frontend/
# FROM node:18-alpine → npm ci → npm run build → CMD ["npm", "start"]

docker build -t workplace-ems:latest .
docker run -p 3000:3000 -d --name workplace workplace-ems:latest
```

---

## 🗄️ Database & Backend Roadmap

The frontend currently runs on a client-side store (`frontend/src/lib/store.tsx`) whose actions map 1:1 onto the future API routes and domain services (e.g. `decideLeave` → `LeaveService.approve`, `addEmployee` → onboarding transaction, `generatePayroll` → `PayrollService`). Swapping it for real endpoints only requires replacing the action bodies with `fetch` calls.

As detailed in `frontend/src/database_planning.md`, the platform is designed around a **4-Layer Architecture Pattern**:

1. **Presentation Layer**: Next.js 14 App Router UI components.
2. **API Route Handlers**: Type-safe REST / Server Action endpoints.
3. **Domain Services & Event Engine**: Encapsulating transactional business logic (e.g., `LeaveService`, `PayrollService`, `EventBus`).
4. **Data Access Layer (DAL)**: **Prisma ORM** connecting to a normalized **PostgreSQL** database ensuring ACID compliance and recursive hierarchical organizational queries (`WITH RECURSIVE`).

---

## 📜 License & Acknowledgments

- **License**: Released under the [MIT License](LICENSE).
- **Academic Program**: Department of Computer Science & Engineering, Adamas University.
- **Created by**: **Team Magnum** (Souradeep Pradhan, Srijit Paul, Aniruddha Das, Asmita Mishra, Anisha Dan, Soubhik Dutta).
- **Icons & Assets**: Styled using customized Lucide & SVG icons, Tailwind CSS design tokens, and Next.js typography optimizations.
