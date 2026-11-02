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
   - [Extra & Connected Differentiator Features (The Wedge)](#42-extra--connected-differentiator-features-the-wedge)
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

### 4.1. Core Common HR Features (Table Stakes)
Essential operational modules required by modern enterprise standards:

- 🛡️ **Role-Based Access Control (RBAC)**: Distinct permissions for `SUPER_ADMIN`, `HR_ADMIN`, `MANAGER`, and `EMPLOYEE`.
- 🔐 **Authentication & Session Routing**: Clean login and signup screens with error states, form validation, and role redirection (`/login`, `/signup`).
- 📊 **Admin Executive Overview (`/admin`)**:
  - Live metric widgets: Total Headcount (`142`), Pending Leave Approvals (`7`), and Organizational Capacity (`92%`).
  - Global real-time audit feed tracking system actions and announcements.
- 👥 **Employee Directory (`/admin/directory`)**:
  - Comprehensive employee index with status filters (Active, Onboarding, Terminated).
  - Department, designation, and reporting manager mappings.
  - Interactive modal to add new hires to the company roster.
- 🏖️ **Leave Management & Approvals (`/admin/leaves`)**:
  - Central queue to review, approve, or reject employee leave requests.
  - Quota ledger checking (Annual, Sick, Casual, Parental).
- 💰 **Payroll & Compensation Management (`/admin/payroll`)**:
  - Salary structure configuration, tax deductions, and automated net pay computation.
  - Payslip generation and expense reimbursement claim audits.
- 📈 **Performance Management (`/admin/performance`)**:
  - Goal tracking (OKRs / KPIs) across quarters.
  - 360-degree review cycles (self, peer, and manager ratings).
- 🔒 **Access Management (`/admin/access`)**:
  - Permission assignment, module visibility switches, and account status controls.
- 👤 **Employee Self-Service Portal (`/employee`, `/employee/profile`)**:
  - Personal profile view with contact information, department, and emergency contacts.
  - Personal leave portal to submit requests and track remaining balances (`/employee/leaves`).

---

### 4.2. Extra & Connected Differentiator Features (The Wedge)
Unique high-impact capabilities bridging HR and project workflows:

- 🔄 **Onboarding → Auto-Generated Kanban Board**:
  - Adding a new hire dynamically creates a pre-configured onboarding Kanban board with tasks for IT setup, documentation, buddy assignment, and initial training.
- ⚠️ **Leave Approval → Automatic Task Delay Signaling**:
  - When an employee's leave request is approved, active tasks assigned to them are automatically flagged as `"Delayed — On Leave"`.
  - The system proactively recommends task reassignment to available peers.
- 🌳 **Org Chart-Driven Task Governance**:
  - Task viewing, delegation, and approval rights inherit directly from the organizational reporting hierarchy, eliminating duplicate permission setups.
- 🎯 **Objective Performance Reviews from Real Work Velocity**:
  - Evaluation cycles pull real deliverables, completed tickets, and deadline adherence statistics into review templates, eliminating subjective bias.
- ⏱️ **Attendance & Workload Context Alignment**:
  - Managers reviewing project timelines can view sprint capacity alongside real-time attendance and planned leave.
- 📋 **Dual-View Work Management (`/employee/tasks`)**:
  - **Interactive List View**: Prioritized daily task list with high/medium/low priority chips and status indicators.
  - **Kanban Board View**: Drag-and-drop workflow columns (*To Do*, *In Progress*, *Under Review*, *Done*).
- 🌓 **Dynamic Theme System**:
  - System-wide Dark Mode and Light Mode support powered by `next-themes` with seamless transitions.
- 💎 **Glassmorphic Aesthetic Design**:
  - Tailored UI built with backdrop filters, subtle micro-borders, gradient overlays, and modern typography.
- 📱 **Interactive Navigation & Profile Drawer (`ProfileDropdown`)**:
  - One-click role switching between Admin and Employee dashboards, user details, and quick setting links.

---

## 📂 Repository Structure

```text
Software-Engineering-Project/
├── .git/                                 # Git version control metadata
├── LICENSE                               # MIT License
├── README.md                             # Comprehensive project documentation (this file)
│
├── docs/                                 # Academic & Architectural Documentation
│   ├── content.md                        # SRS & Product Feature specifications
│   └── project_overview.tex              # Complete LaTeX academic project documentation
│
└── frontend/                             # Next.js 14 Web Application
    ├── package.json                      # Dependencies and npm scripts
    ├── tsconfig.json                     # TypeScript compiler options
    ├── tailwind.config.ts                # Tailwind styling configurations
    ├── postcss.config.mjs                # PostCSS configuration
    ├── next.config.mjs                   # Next.js runtime configurations
    │
    ├── public/                           # Static assets
    │   ├── logo.png                      # Official Workplace logo
    │   ├── favicon.png                   # Browser favicon
    │   ├── bg.png                        # Hero glassmorphic background
    │   └── assets/                       # Vector SVGs, icons, and branding illustrations
    │
    └── src/
        ├── database_planning.md          # PostgreSQL schema & 4-Layer DAL blueprint
        │
        ├── components/                   # Reusable UI Components
        │   ├── ProfileDropdown.tsx       # User avatar & role switcher dropdown
        │   └── ThemeProvider.tsx         # Next-themes dark/light context provider
        │
        └── app/                          # Next.js 14 App Router
            ├── (auth)/                   # Authentication route group
            │   ├── layout.tsx            # Split-screen auth layout
            │   ├── login/page.tsx        # Sign-in portal
            │   └── signup/page.tsx       # Sign-up portal
            │
            ├── admin/                    # HR Admin Workspace
            │   ├── layout.tsx            # Admin sidebar navigation & header
            │   ├── page.tsx              # Admin Overview & metric cards
            │   ├── directory/page.tsx    # Employee Directory & Onboarding modal
            │   ├── leaves/page.tsx       # Leave approval queue
            │   ├── payroll/page.tsx      # Payroll & salary configuration
            │   ├── performance/page.tsx  # Employee review cycles
            │   └── access/page.tsx       # User permissions management
            │
            ├── employee/                 # Employee Workspace
            │   ├── layout.tsx            # Employee sidebar navigation & header
            │   ├── page.tsx              # Employee personal overview
            │   ├── tasks/page.tsx        # Task management (List & Kanban views)
            │   ├── leaves/page.tsx       # Personal leave balance & application
            │   └── profile/page.tsx      # Personal & professional profile
            │
            ├── globals.css               # Global CSS & Tailwind layers
            ├── layout.tsx                # Root layout with ThemeProvider
            ├── not-found.tsx             # Custom 404 page
            └── page.tsx                  # Workplace landing page
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

# Step 3 — (Optional) Create frontend/.env.local
# NEXT_PUBLIC_APP_NAME="Workplace"
# DATABASE_URL="postgresql://user:pass@localhost:5432/workplace_ems"

# Step 4 — Run
npm run dev
```

> **Result →** Open **http://localhost:3000** in your browser. The app hot-reloads on file changes.

---

### 🧭 Route Map — Pages You Can Explore

```text
http://localhost:3000/
├── / ........................... Public Landing Page (Overview, Hero, Features)
├── (auth)/
│   ├── /login .................. User Authentication / Sign-In Portal
│   └── /signup ................. New Account Registration
├── admin/ ...................... HR Admin Workspace
│   ├── /admin .................. Executive Dashboard & Headcount KPIs
│   ├── /admin/directory ........ Employee Index & Add New Hire Modal
│   ├── /admin/leaves ........... Leave Approval Queue & Ledgers
│   ├── /admin/payroll .......... Salary Breakdown & Tax Computation
│   ├── /admin/performance ...... OKR Evaluation & Review Cycles
│   └── /admin/access ........... Role Assignment & Permissions
└── employee/ ................... Employee Self-Service Workspace
    ├── /employee ............... Personal Overview & Quick Status
    ├── /employee/tasks ......... Task Management (List & Kanban Views)
    ├── /employee/leaves ........ Leave Balance & Submission
    └── /employee/profile ....... Personal Profile & Reporting Info
```

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
