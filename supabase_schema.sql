-- ====================================================================
-- WORKPLACE EMS (EMPLOYEE MANAGEMENT SYSTEM) - SUPABASE DATABASE SCHEMA
-- ====================================================================
-- Run this script in your Supabase project:
-- 1. Open your Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Click "SQL Editor" on the left sidebar
-- 3. Click "New Query", paste this entire script, and click "Run"
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Departments Table
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  head_id TEXT,
  color TEXT NOT NULL DEFAULT 'blue'
);

-- 3. Employees / Users Table
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL DEFAULT 'demo1234',
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'EMPLOYEE', -- 'SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'
  account_status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'SUSPENDED'
  designation TEXT NOT NULL,
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  manager_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  buddy_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'ONBOARDING', 'ON_LEAVE', 'OFFBOARDING', 'TERMINATED'
  location TEXT DEFAULT 'HQ - Mumbai',
  work_mode TEXT DEFAULT 'Hybrid', -- 'Onsite', 'Hybrid', 'Remote'
  shift TEXT DEFAULT 'General (9:00 AM - 6:00 PM)',
  dob DATE,
  gender TEXT DEFAULT 'Other',
  address TEXT,
  emergency_contact JSONB DEFAULT '{"name": "", "relation": "", "phone": ""}'::jsonb,
  skills TEXT[] DEFAULT '{}',
  certifications TEXT[] DEFAULT '{}',
  salary JSONB DEFAULT '{"basic": 50000, "hra": 20000, "allowances": 10000, "otherDeductions": 2000, "effectiveDate": "2026-01-01"}'::jsonb,
  bank_account TEXT,
  pan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Foreign key for head of department
ALTER TABLE departments
  DROP CONSTRAINT IF EXISTS fk_departments_head,
  ADD CONSTRAINT fk_departments_head FOREIGN KEY (head_id) REFERENCES employees(id) ON DELETE SET NULL;

-- 4. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PRESENT', -- 'PRESENT', 'ABSENT', 'HALF_DAY', 'REMOTE', 'ON_LEAVE'
  CONSTRAINT uq_employee_date UNIQUE (employee_id, date)
);

-- 5. Leave Requests Table
CREATE TABLE IF NOT EXISTS leaves (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'ANNUAL', 'SICK', 'CASUAL', 'PARENTAL', 'UNPAID'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INT NOT NULL DEFAULT 1,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'
  approver_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  decision_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  decided_at TIMESTAMPTZ
);

-- 6. Timesheets Table
CREATE TABLE IF NOT EXISTS timesheets (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'
  submitted_at TIMESTAMPTZ,
  decided_by TEXT REFERENCES employees(id),
  CONSTRAINT uq_employee_week UNIQUE (employee_id, week_start)
);

-- 7. Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  lead_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED'
  color TEXT DEFAULT 'indigo',
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE
);

-- 7. Kanban Boards Table
CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'PROJECT', -- 'PROJECT', 'ONBOARDING', 'PERSONAL'
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  owner_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Board Columns Table
CREATE TABLE IF NOT EXISTS board_columns (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'todo', -- 'todo', 'in_progress', 'review', 'done'
  order_index INT NOT NULL DEFAULT 0
);

-- 9. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
  due_date DATE,
  creator_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  flag TEXT NOT NULL DEFAULT 'NORMAL', -- 'NORMAL', 'DELAYED_ON_LEAVE', 'BLOCKED'
  recurrence TEXT DEFAULT 'NONE',
  tags TEXT[] DEFAULT '{}',
  comments JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  order_index INT NOT NULL DEFAULT 0
);

-- 10. Task Assignees Junction Table
CREATE TABLE IF NOT EXISTS task_assignees (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, employee_id)
);

-- 11. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  receipt_name TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'REIMBURSED'
  decided_by TEXT REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  recipient_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'SYSTEM', -- 'HR', 'WORK', 'SYSTEM'
  read BOOLEAN NOT NULL DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Activity Log Table
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'SYSTEM',
  at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- SEED INITIAL CORE ENTERPRISE DATA (Matches Workplace Demo)
-- --------------------------------------------------------------------

-- Insert Departments
INSERT INTO departments (id, name, code, color) VALUES
  ('dept_eng', 'Engineering', 'ENG', 'blue'),
  ('dept_prod', 'Product & Design', 'PRD', 'violet'),
  ('dept_hr', 'People & Culture', 'HR', 'emerald'),
  ('dept_mkt', 'Growth & Marketing', 'MKT', 'amber'),
  ('dept_ops', 'Operations & Finance', 'OPS', 'slate')
ON CONFLICT (id) DO NOTHING;

-- Insert Core Demo Employees
INSERT INTO employees (id, code, first_name, last_name, email, password_hash, role, designation, department_id, location, work_mode, joining_date, status) VALUES
  ('emp_arjun', 'EMP-001', 'Arjun', 'Mehta', 'arjun@workplace.com', 'demo1234', 'SUPER_ADMIN', 'Chief Executive Officer', 'dept_eng', 'HQ - Mumbai', 'Onsite', '2022-01-10', 'ACTIVE'),
  ('emp_neha', 'EMP-002', 'Neha', 'Kapoor', 'neha@workplace.com', 'demo1234', 'HR_ADMIN', 'VP of People & Culture', 'dept_hr', 'HQ - Mumbai', 'Hybrid', '2022-03-01', 'ACTIVE'),
  ('emp_john', 'EMP-003', 'John', 'Doe', 'john@workplace.com', 'demo1234', 'MANAGER', 'Engineering Lead', 'dept_eng', 'Bengaluru Hub', 'Hybrid', '2022-06-15', 'ACTIVE'),
  ('emp_alice', 'EMP-004', 'Alice', 'Smith', 'alice@workplace.com', 'demo1234', 'EMPLOYEE', 'Senior Product Designer', 'dept_prod', 'Remote - Pune', 'Remote', '2023-01-09', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Assign Department Heads & Managers
UPDATE departments SET head_id = 'emp_arjun' WHERE id = 'dept_eng';
UPDATE departments SET head_id = 'emp_neha' WHERE id = 'dept_hr';
UPDATE employees SET manager_id = 'emp_arjun' WHERE id IN ('emp_neha', 'emp_john');
UPDATE employees SET manager_id = 'emp_john' WHERE id = 'emp_alice';

-- Insert Sample Project & Kanban Board
INSERT INTO projects (id, name, description, department_id, lead_id, status, color) VALUES
  ('proj_core', 'Workplace Platform 2.0', 'Enterprise unified workspace and connected wedge integration.', 'dept_eng', 'emp_john', 'ACTIVE', 'indigo')
ON CONFLICT (id) DO NOTHING;

INSERT INTO boards (id, title, type, project_id) VALUES
  ('board_core', 'Sprint 24 Board', 'PROJECT', 'proj_core')
ON CONFLICT (id) DO NOTHING;

INSERT INTO board_columns (id, board_id, name, category, order_index) VALUES
  ('col_todo', 'board_core', 'To Do', 'todo', 0),
  ('col_prog', 'board_core', 'In Progress', 'in_progress', 1),
  ('col_rev', 'board_core', 'In Review', 'review', 2),
  ('col_done', 'board_core', 'Completed', 'done', 3)
ON CONFLICT (id) DO NOTHING;

-- Insert Sample Tasks
INSERT INTO tasks (id, board_id, column_id, title, description, priority, due_date, creator_id, flag) VALUES
  ('task_01', 'board_core', 'col_prog', 'Wire Supabase PostgreSQL backend', 'Connect Next.js 14 App Router to Supabase cloud tables.', 'HIGH', CURRENT_DATE + 3, 'emp_john', 'NORMAL'),
  ('task_02', 'board_core', 'col_todo', 'Implement Connected Wedge Leave Trigger', 'Flag tasks as DELAYED_ON_LEAVE automatically upon leave approval.', 'URGENT', CURRENT_DATE + 5, 'emp_john', 'NORMAL')
ON CONFLICT (id) DO NOTHING;

INSERT INTO task_assignees (task_id, employee_id) VALUES
  ('task_01', 'emp_alice'),
  ('task_02', 'emp_john')
ON CONFLICT (task_id, employee_id) DO NOTHING;

-- Enable Row Level Security (RLS) - Set public access for initial development
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Allow anonymous / authenticated read and write for the application demo
DROP POLICY IF EXISTS "Allow all for anon" ON departments;
CREATE POLICY "Allow all for anon" ON departments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON employees;
CREATE POLICY "Allow all for anon" ON employees FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON attendance;
CREATE POLICY "Allow all for anon" ON attendance FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON leaves;
CREATE POLICY "Allow all for anon" ON leaves FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON projects;
CREATE POLICY "Allow all for anon" ON projects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON boards;
CREATE POLICY "Allow all for anon" ON boards FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON board_columns;
CREATE POLICY "Allow all for anon" ON board_columns FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON tasks;
CREATE POLICY "Allow all for anon" ON tasks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON task_assignees;
CREATE POLICY "Allow all for anon" ON task_assignees FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON expenses;
CREATE POLICY "Allow all for anon" ON expenses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON notifications;
CREATE POLICY "Allow all for anon" ON notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON activity_log;
CREATE POLICY "Allow all for anon" ON activity_log FOR ALL USING (true) WITH CHECK (true);

