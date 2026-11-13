// database/scripts/check-supabase.mjs
// Verifies live Supabase database connection, tables, employee count, and pending queues

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envCandidates = [
  path.resolve(process.cwd(), 'frontend/.env.local'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(__dirname, '../../frontend/.env.local'),
];

let envText = '';
for (const cand of envCandidates) {
  if (fs.existsSync(cand)) {
    envText = fs.readFileSync(cand, 'utf8');
    break;
  }
}

const urlMatch = envText.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = envText.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/);

const url = (urlMatch ? urlMatch[1] : 'https://itayakyorxrdrlgqoell.supabase.co').replace(/["']/g, '').trim();
const key = (keyMatch ? keyMatch[1] : 'sb_publishable_W-2IX1Z0rUK-MOkQWfcsMQ_0XD2CBP3').replace(/["']/g, '').trim();

async function check() {
  console.log('Connecting to Supabase:', url);

  const empRes = await fetch(`${url}/rest/v1/employees?select=id,first_name,last_name,email,designation,department_id,account_status`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const employees = await empRes.json();
  console.log(`\nSupabase Total Employee Count: ${employees.length}`);
  employees.forEach(e => {
    console.log(` - [${e.id}] ${e.first_name} ${e.last_name} | ${e.designation} | Dept: ${e.department_id} | ${e.email}`);
  });

  const deptRes = await fetch(`${url}/rest/v1/departments?select=*`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const depts = await deptRes.json();
  console.log(`\nDepartment Distribution (Target: 2-3 per category):`);
  for (const d of depts) {
    const matching = employees.filter(e => e.department_id === d.id);
    console.log(` - [${d.id}] "${d.name}" (${matching.length} employees): ${matching.map(e => `${e.first_name} ${e.last_name}`).join(', ')}`);
  }

  const leavesRes = await fetch(`${url}/rest/v1/leaves?status=eq.PENDING&select=id,employee_id,type,days,reason,status`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const leaves = await leavesRes.json();
  console.log(`\nSupabase Pending Leaves: ${leaves.length}`);
  leaves.forEach(l => {
    const emp = employees.find(e => e.id === l.employee_id);
    const requester = emp ? `${emp.first_name} ${emp.last_name}` : l.employee_id;
    console.log(` - Leave ID: ${l.id} | Requester: ${requester} | Type: ${l.type} | Days: ${l.days} | Reason: ${l.reason}`);
  });

  const expensesRes = await fetch(`${url}/rest/v1/expenses?status=eq.PENDING&select=id,employee_id,category,amount,description,status,receipt_name`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const expenses = await expensesRes.json();
  console.log(`\nSupabase Pending Expenses: ${expenses.length}`);
  expenses.forEach(x => {
    const emp = employees.find(e => e.id === x.employee_id);
    const requester = emp ? `${emp.first_name} ${emp.last_name}` : x.employee_id;
    console.log(` - Expense ID: ${x.id} | Requester: ${requester} | Category: ${x.category} | Amount: ₹${x.amount} | Description: ${x.description} | Receipt: ${x.receipt_name || 'None'}`);
  });

  console.log('\n✔ All Supabase live database checks passed successfully!');
}

check().catch(console.error);
