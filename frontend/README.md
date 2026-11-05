# Workplace — Frontend Application

<p align="center">
  <img src="public/logo.png" alt="Workplace Logo" width="320"/>
</p>

<p align="center">
  <strong>The Unified Workspace for Enterprise HR Operations & Connected Work Management</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Academic-Team_Magnum-purple?style=for-the-badge" alt="Team Magnum" />
</p>

> For complete architectural documentation, system context diagrams, and SRS requirements, refer to the root repository documentation in [../README.md](../README.md).

---

## ⚡ Quick Start on Localhost

```bash
# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to explore the platform.

No database or environment variables are needed: the app ships with a typed client-side data store (`src/lib/store.tsx`) seeded with a realistic demo organization and persisted to `localStorage`.

### 🔑 Demo accounts

Pick one from the **Demo account** dropdown on `/login`, or type it in. The password for all accounts is `demo1234`.

| Role | Email |
| :--- | :--- |
| Super Admin | `arjun@workplace.com` |
| HR Admin | `neha@workplace.com` |
| Manager | `john@workplace.com` |
| Employee | `alice@workplace.com` |

Use **Profile menu → Reset demo data** to restore the seed.

> **Windows note:** `next build` on Next 14.2.3 fails with `Cannot find module for page: /_document` if the folder path contains parentheses (e.g. `New folder (2)`). Build from a path without brackets (or a `subst` drive).

---

## 🧭 Application Routes

- **Landing Page**: `http://localhost:3000/`
- **Admin Overview**: `http://localhost:3000/admin`
- **Employee Directory**: `http://localhost:3000/admin/directory`
- **Leave Approvals**: `http://localhost:3000/admin/leaves`
- **Payroll Management**: `http://localhost:3000/admin/payroll`
- **Performance Hub**: `http://localhost:3000/admin/performance`
- **Access Control**: `http://localhost:3000/admin/access`
- **Employee Portal**: `http://localhost:3000/employee`
- **Task Workspace (List & Kanban)**: `http://localhost:3000/employee/tasks`
- **My Leaves**: `http://localhost:3000/employee/leaves`
- **Employee Profile**: `http://localhost:3000/employee/profile`
- **Admin extras**: `/admin/org-chart`, `/admin/onboarding`, `/admin/projects`, `/admin/attendance`, `/admin/expenses`, `/admin/reports`, `/admin/notifications`, `/admin/settings`, `/admin/directory/[id]`
- **Employee extras**: `/employee/attendance`, `/employee/payslips`, `/employee/expenses`, `/employee/performance`, `/employee/team`, `/employee/directory`, `/employee/org-chart`, `/employee/notifications`
- **Login**: `http://localhost:3000/login`
- **Signup**: `http://localhost:3000/signup`

---

## 🚀 Build for Production ("Make It Live")

```bash
# Production Build
npm run build

# Start Production Server
npm start
```
