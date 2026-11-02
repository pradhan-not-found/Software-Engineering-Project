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
   - [Repository & File Organization Flow](#2-repository--file-organization-flow)
   - [Software User Journey Flow](#3-software-user-journey-flow)
   - [Connected Wedge — Reactive Event Flow](#4-connected-wedge--reactive-event-flow)
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

```mermaid
flowchart TB
    subgraph Users["System Actors & Roles"]
        Admin["HR Admin / Super Admin"]
        Manager["Department Manager"]
        Employee["Employee"]
    end

    subgraph Client["Presentation Layer (Next.js 14 + Tailwind CSS)"]
        LP["Landing Page (/)"]
        AuthViews["Auth Portal (/login, /signup)"]
        AdminHub["Admin Workspace (/admin)
        • Directory & Onboarding
        • Leave Approval Queue
        • Payroll & Tax Breakdown
        • Performance & Access Control"]
        EmployeeHub["Employee Portal (/employee)
        • Personal Dashboard
        • Tasks (List & Kanban Views)
        • Leave Request & Quotas
        • My Profile & Reporting Hierarchy"]
    end

    subgraph Engine["Connected Business Engine & Event Bus"]
        AuthGate["RBAC Access & Route Protection"]
        ConnEngine["Connected Logic Engine
        • Auto-generate Onboarding Boards
        • Auto-flag Delayed Tasks on Approved Leave
        • Inherit Task Permissions from Org Chart
        • Prepopulate Reviews with Velocity Metrics"]
    end

    subgraph DataLayer["Data & Persistence Layer"]
        Prisma["Prisma ORM / Data Access Layer (DAL)"]
        Postgres[(PostgreSQL Database
        • Users & Employee Profiles
        • Departments & Org Hierarchy
        • Attendance & Leave Quotas
        • Tasks, Boards & Payroll Records)]
    end

    Users --> Client
    LP --> AuthViews
    AuthViews --> AuthGate
    AuthGate --> AdminHub
    AuthGate --> EmployeeHub
    AdminHub & EmployeeHub --> ConnEngine
    ConnEngine --> Prisma
    Prisma --> Postgres
```

---

### 2. Repository & File Organization Flow

```mermaid
graph TD
    Root["Software-Engineering-Project/"]
    Root --> DocsDir["📁 docs/"]
    Root --> FrontendDir["📁 frontend/"]
    Root --> License["📄 LICENSE"]
    Root --> Readme["📄 README.md"]

    DocsDir --> DocContent["content.md (SRS & Feature Architecture)"]
    DocsDir --> DocTex["project_overview.tex (Full Academic LaTeX Report)"]

    FrontendDir --> PublicDir["📁 public/"]
    FrontendDir --> SrcDir["📁 src/"]
    FrontendDir --> PkgJson["package.json & configs (Next.js 14, Tailwind, TS)"]

    PublicDir --> Logo["logo.png (Workplace Official Logo)"]
    PublicDir --> Bg["bg.png (Glassmorphism backdrop)"]
    PublicDir --> Assets["📁 assets/ (SVGs, icons, Casp branding)"]

    SrcDir --> AppDir["📁 app/"]
    SrcDir --> CompDir["📁 components/ (ProfileDropdown, ThemeProvider)"]
    SrcDir --> DbPlan["database_planning.md (PostgreSQL 4-layer DAL Plan)"]

    AppDir --> AuthRoutes["📁 (auth)/ (login, signup)"]
    AppDir --> AdminRoutes["📁 admin/ (directory, leaves, payroll, performance, access)"]
    AppDir --> EmpRoutes["📁 employee/ (tasks, leaves, profile)"]
    AppDir --> RootPage["page.tsx (Landing Page)"]
```

---

### 3. Software User Journey Flow

This diagram illustrates how different users navigate through the Workplace platform after authentication:

```mermaid
flowchart TD
    Start(["🌐 User Visits Workplace"]) --> Landing["Landing Page (/)\n• Product Overview\n• Hero Section & CTA"]

    Landing --> AuthCheck{"Authenticated?"}
    AuthCheck -- No --> AuthPortal["Auth Portal"]
    AuthPortal --> Login["Login (/login)"]
    AuthPortal --> Signup["Signup (/signup)"]
    Login & Signup --> RoleCheck

    AuthCheck -- Yes --> RoleCheck{"User Role?"}

    RoleCheck -- SUPER_ADMIN / HR_ADMIN --> AdminDash
    RoleCheck -- MANAGER --> AdminDash
    RoleCheck -- EMPLOYEE --> EmpDash

    subgraph AdminWorkspace["🔧 Admin Workspace"]
        AdminDash["Dashboard (/admin)\n• Headcount KPIs\n• Pending Approvals\n• Org Capacity %\n• Global Activity Feed"]
        AdminDash --> Dir["📋 Directory\n(/admin/directory)\n• Employee Roster\n• Add New Hire\n• Status Filters"]
        AdminDash --> Leaves["🏖️ Leave Queue\n(/admin/leaves)\n• Review Requests\n• Approve / Reject\n• Quota Ledger"]
        AdminDash --> Pay["💰 Payroll\n(/admin/payroll)\n• Salary Config\n• Tax Deductions\n• Payslip Gen"]
        AdminDash --> Perf["📈 Performance\n(/admin/performance)\n• OKR Tracking\n• Review Cycles\n• 360° Feedback"]
        AdminDash --> Access["🔒 Access Control\n(/admin/access)\n• Role Assignment\n• Module Visibility"]
    end

    subgraph EmpWorkspace["👤 Employee Workspace"]
        EmpDash["Dashboard (/employee)\n• Personal Overview\n• Attendance Status\n• Quick Actions"]
        EmpDash --> Tasks["📋 My Tasks\n(/employee/tasks)\n• List View\n• Kanban Board\n• Priority Tagging"]
        EmpDash --> MyLeaves["🏖️ My Leaves\n(/employee/leaves)\n• Submit Request\n• Balance Tracker\n• Holiday Calendar"]
        EmpDash --> Profile["👤 My Profile\n(/employee/profile)\n• Personal Info\n• Reporting Manager\n• Emergency Contact"]
    end

    Dir -.->|"🔄 Onboarding triggers\nauto Kanban board"| Tasks
    Leaves -.->|"⚠️ Approved leave flags\ntasks as delayed"| Tasks
    Perf -.->|"🎯 Reviews pull real\ntask velocity data"| Tasks
```

---

### 4. Connected Wedge — Reactive Event Flow

This is the core differentiator: HR events and Work events are **reactively connected** in a single system.

```mermaid
flowchart LR
    subgraph HREvents["📌 HR Domain Events"]
        E1["New Hire Added\nto Directory"]
        E2["Leave Request\nApproved"]
        E3["Org Chart\nUpdated"]
        E4["Attendance\nLogged"]
    end

    subgraph EventBus["⚡ Connected Event Engine"]
        Bus(("Reactive\nEvent Bus"))
    end

    subgraph WorkEffects["🔧 Automated Work Effects"]
        W1["✅ Auto-generate Onboarding\nKanban Board with IT, HR,\nBuddy & Training tasks"]
        W2["⚠️ Flag active tasks as\n'Delayed — On Leave'\n+ Suggest Reassignment"]
        W3["🔑 Inherit task view/assign\npermissions from reporting\nhierarchy automatically"]
        W4["📊 Update workload context\nin sprint planning &\nmanager leave-approval view"]
    end

    subgraph PerfLoop["🎯 Performance Feedback Loop"]
        P1["Pull real task velocity,\ndeadline adherence &\ndeliverables into Reviews"]
    end

    E1 --> Bus --> W1
    E2 --> Bus --> W2
    E3 --> Bus --> W3
    E4 --> Bus --> W4
    W1 & W2 & W3 & W4 --> P1
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

```mermaid
flowchart LR
    A["📥 Prerequisites\n• Node.js ≥ 18.17\n• Git installed\n• npm / pnpm / yarn"] --> B["📦 Clone Repo\ngit clone ...\ncd Software-Engineering-Project"]
    B --> C["📂 Enter Frontend\ncd frontend"]
    C --> D["⬇️ Install Deps\nnpm install"]
    D --> E["⚙️ .env.local\n(Optional config)"]
    E --> F["🚀 Launch Server\nnpm run dev"]
    F --> G["🌐 Open Browser\nhttp://localhost:3000"]

    style A fill:#f0f4ff,stroke:#4a6fa5,color:#1a1a2e
    style B fill:#f0f4ff,stroke:#4a6fa5,color:#1a1a2e
    style C fill:#f0f4ff,stroke:#4a6fa5,color:#1a1a2e
    style D fill:#f0f4ff,stroke:#4a6fa5,color:#1a1a2e
    style E fill:#fffbe6,stroke:#b8860b,color:#1a1a2e
    style F fill:#e8f5e9,stroke:#2e7d32,color:#1a1a2e
    style G fill:#e8f5e9,stroke:#2e7d32,color:#1a1a2e
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

```mermaid
flowchart TD
    Root["🌐 localhost:3000"] --> LP["/ — Landing Page"]
    Root --> Auth["Authentication"]
    Root --> Admin["Admin Workspace"]
    Root --> Emp["Employee Workspace"]

    Auth --> Login["/login"]
    Auth --> Signup["/signup"]

    Admin --> AD["/admin — Dashboard & KPIs"]
    AD --> A1["/admin/directory — Employee Roster"]
    AD --> A2["/admin/leaves — Leave Approval Queue"]
    AD --> A3["/admin/payroll — Salary & Tax Config"]
    AD --> A4["/admin/performance — Review Cycles"]
    AD --> A5["/admin/access — Permission Mgmt"]

    Emp --> ED["/employee — Personal Overview"]
    ED --> E1["/employee/tasks — List & Kanban"]
    ED --> E2["/employee/leaves — Balance Tracker"]
    ED --> E3["/employee/profile — My Profile"]

    style Root fill:#1a1a2e,stroke:#1a1a2e,color:#ffffff
    style LP fill:#f0f4ff,stroke:#4a6fa5,color:#1a1a2e
    style Auth fill:#fff3e0,stroke:#e65100,color:#1a1a2e
    style Admin fill:#e8eaf6,stroke:#283593,color:#1a1a2e
    style Emp fill:#e0f2f1,stroke:#00695c,color:#1a1a2e
```

---

## 🌐 Making It Live (Production Deployment)

### Deployment Pipeline — Visual Overview

```mermaid
flowchart TD
    subgraph Step1["1. Prepare & Push"]
        Code["Local Code"] --> Commit["git add . && git commit"]
        Commit --> Push["git push origin main"]
        Push --> GH[("GitHub Repository")]
    end

    GH --> Choice{"Choose Hosting"}

    subgraph OptionA["⭐ Option A: Vercel (Recommended)"]
        V1["Import repo on vercel.com"] --> V2["Set root dir → frontend"]
        V2 --> V3["Click Deploy"]
        V3 --> V4["✅ Auto SSL + CDN\nhttps://workplace-ems.vercel.app"]
    end

    subgraph OptionB["Option B: VPS + Nginx"]
        S1["npm run build"] --> S2["PM2 process manager\npm2 start npm -- start"]
        S2 --> S3["Nginx reverse proxy\n→ localhost:3000"]
        S3 --> S4["Certbot SSL cert"]
        S4 --> S5["✅ https://yourdomain.com"]
    end

    subgraph OptionC["Option C: Docker"]
        D1["Write Dockerfile"] --> D2["docker build -t workplace ."]
        D2 --> D3["docker run -p 3000:3000"]
        D3 --> D4["✅ Container live on :3000"]
    end

    Choice --> OptionA
    Choice --> OptionB
    Choice --> OptionC

    subgraph DB["Database (All Options)"]
        CloudDB[("Cloud PostgreSQL\nSupabase / Neon / AWS RDS")]
    end

    V4 & S5 & D4 <-.-> CloudDB

    style OptionA fill:#e8f5e9,stroke:#2e7d32,color:#1a1a2e
    style OptionB fill:#e3f2fd,stroke:#1565c0,color:#1a1a2e
    style OptionC fill:#fce4ec,stroke:#c62828,color:#1a1a2e
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
