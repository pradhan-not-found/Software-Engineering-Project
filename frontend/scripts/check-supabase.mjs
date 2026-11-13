import fs from 'fs';

const envText = fs.readFileSync('frontend/.env.local', 'utf8');
const urlMatch = envText.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = envText.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/);

const url = urlMatch[1].replace(/["']/g, '').trim();
const key = keyMatch[1].replace(/["']/g, '').trim();

async function check() {
  const empRes = await fetch(`${url}/rest/v1/employees?select=id,first_name,last_name,email,designation,account_status`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const employees = await empRes.json();
  console.log(`Supabase Employee Count: ${employees.length}`);
  employees.forEach(e => {
    console.log(` - [${e.id}] ${e.first_name} ${e.last_name} | ${e.designation} | ${e.email} | ${e.account_status}`);
  });

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

  const expensesRes = await fetch(`${url}/rest/v1/expenses?select=*`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const expenses = await expensesRes.json();
  console.log('\nSupabase Expenses Raw:', JSON.stringify(expenses, null, 2));
}

check().catch(console.error);
